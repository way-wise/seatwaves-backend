import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Currency, BookingStatus, EventStatus } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import { addDaysUTC, endOfUTCDay, startOfUTCDay } from 'src/common/utc';
import { EventService } from 'src/event/event.service';
import { ExperienceService } from 'src/experience/experience.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';
import { StripeService } from 'src/stripe/stripe.service';

// Configuration constants
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_BUFFER_DAYS = 30;
const DEFAULT_CONCURRENT_JOBS = 5;
const LOCK_TTL = 300000; // 5 minutes
const JOB_RETRY_ATTEMPTS = 3;
const JOB_RETRY_DELAY = 5000; // 5 seconds

export interface TaskMetrics {
  totalProcessed: number;
  totalCreated: number;
  totalErrors: number;
  batchesQueued: number;
  processingTimeMs: number;
}

/** Admin-triggerable response */
export interface RunOnceResult {
  started: boolean;
  message?: string;
  metrics?: TaskMetrics;
}

interface RecurringEventJobData {
  experienceId: string;
  batchId: string;
  retryCount?: number;
  // ISO date string (UTC) of the single target date to generate
  targetDate?: string;
}

@Injectable()
export class TasksService implements OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);
  private readonly batchSize: number;
  private readonly bufferDays: number;
  private readonly concurrentJobs: number;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUES.EVENT) private readonly eventQueue: Queue,
  ) {
    this.batchSize =
      this.configService.get<number>('RECURRING_EVENT_BATCH_SIZE') ??
      DEFAULT_BATCH_SIZE;
    this.bufferDays =
      this.configService.get<number>('RECURRING_EVENT_BUFFER_DAYS') ??
      DEFAULT_BUFFER_DAYS;
    this.concurrentJobs =
      this.configService.get<number>('RECURRING_EVENT_CONCURRENT_JOBS') ??
      DEFAULT_CONCURRENT_JOBS;

    this.logger.log(
      `TasksService initialized: batchSize=${this.batchSize}, bufferDays=${this.bufferDays}, concurrentJobs=${this.concurrentJobs}`,
    );
  }

  /**
   * Daily job to complete past events and update related bookings
   * Runs at 1:10 AM UTC daily
   */
  // @Cron('10 1 * * *')

  //5 hours
  @Cron('0 */5 * * *')
  async completeExpiredEventsDaily() {
    const now = new Date();
    const today = startOfUTCDay(now);
    const startTime = Date.now();
    this.logger.log('Starting daily completion job for events');

    try {
      const batchSize = 500;
      let totalEventsCompleted = 0;
      let totalBookingsUpdated = 0;

      // Pass 1: Complete any event strictly before today (UTC)
      {
        let cursor: string | undefined = undefined;
        while (true) {
          const baseWhere: any = {
            date: { lt: today },
            status: { in: [EventStatus.SCHEDULE, EventStatus.RESCHEDULE] },
          };
          if (cursor) baseWhere.id = { gt: cursor };

          const pastEvents = await this.prisma.events.findMany({
            where: baseWhere,
            select: { id: true },
            orderBy: { id: 'asc' },
            take: batchSize,
          });

          if (pastEvents.length === 0) break;

          const ids = pastEvents.map((e) => e.id);

          const eventResult = await this.prisma.events.updateMany({
            where: { id: { in: ids } },
            data: { status: EventStatus.COMPLETED, isAvailable: false },
          });
          totalEventsCompleted += Number(eventResult?.count || 0);

          const bookingResult = await this.prisma.booking.updateMany({
            where: { eventId: { in: ids }, status: BookingStatus.CONFIRMED },
            data: { status: BookingStatus.COMPLETED, updatedAt: new Date() },
          });
          totalBookingsUpdated += Number(bookingResult?.count || 0);

          cursor = pastEvents[pastEvents.length - 1].id;
        }
      }

      // Pass 2: Complete events that are today but have ended (endTime < now)
      {
        let cursor: string | undefined = undefined;
        while (true) {
          const baseWhere: any = {
            date: today,
            status: { in: [EventStatus.SCHEDULE, EventStatus.RESCHEDULE] },
          };
          if (cursor) baseWhere.id = { gt: cursor };

          const endedToday = await this.prisma.events.findMany({
            where: baseWhere,
            select: { id: true },
            orderBy: { id: 'asc' },
            take: batchSize,
          });
          if (endedToday.length === 0) break;

          const ids = endedToday.map((e) => e.id);
          const eventResult = await this.prisma.events.updateMany({
            where: { id: { in: ids } },
            data: {
              status: EventStatus.COMPLETED,
              isAvailable: false,
              updatedAt: new Date(),
            },
          });
          totalEventsCompleted += Number(eventResult?.count || 0);

          const bookingResult = await this.prisma.booking.updateMany({
            where: { eventId: { in: ids }, status: BookingStatus.CONFIRMED },
            data: { status: BookingStatus.COMPLETED, updatedAt: new Date() },
          });
          totalBookingsUpdated += Number(bookingResult?.count || 0);

          cursor = endedToday[endedToday.length - 1].id;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Event completion job finished in ${duration}ms: eventsCompleted=${totalEventsCompleted}, bookingsUpdated=${totalBookingsUpdated}`,
      );
      return {
        success: true,
        eventsCompleted: totalEventsCompleted,
        bookingsUpdated: totalBookingsUpdated,
        durationMs: duration,
      };
    } catch (error) {
      this.logger.error('Event completion job failed', (error as Error)?.stack);
      return { success: false, error: (error as Error)?.message };
    }
  }

  /**
   * Main cron job - runs every 5 minutes to avoid overwhelming the system
   * Uses distributed locking to prevent multiple instances from running simultaneously
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async scheduleRecurringEventGeneration() {
    const lockKey = 'recurring-events-cron-lock';
    const lockValue = `${process.pid}-${Date.now()}`;

    try {
      // Distributed lock using Redis (via BullMQ connection)
      const acquired = await this.acquireDistributedLock(
        lockKey,
        lockValue,
        LOCK_TTL,
      );
      if (!acquired) {
        this.logger.debug(
          'Another instance is already processing recurring events - skipping',
        );
        return { skipped: true, reason: 'Lock not acquired' };
      }

      if (this.isProcessing) {
        this.logger.warn(
          'Previous recurring event processing still in progress - skipping',
        );
        return { skipped: true, reason: 'Already processing' };
      }

      this.isProcessing = true;
      const startTime = Date.now();

      try {
        this.logger.log('Starting recurring event generation cron job');

        const metrics = await this.processRecurringEventsInBatches();

        const processingTime = Date.now() - startTime;
        this.logger.log(
          `Recurring events cron completed: ${JSON.stringify({
            ...metrics,
            processingTimeMs: processingTime,
          })}`,
        );

        // Store metrics for monitoring
        await this.storeMetrics(metrics);
        return { success: true, metrics };
      } catch (error) {
        this.logger.error(
          'Error in recurring event generation cron',
          (error as Error)?.stack,
        );
        return { success: false, error: (error as Error)?.message };
      } finally {
        this.isProcessing = false;
      }
    } catch (error) {
      this.logger.error(
        'Critical error in cron job setup',
        (error as Error)?.stack,
      );
      return { success: false, error: (error as Error)?.message };
    } finally {
      await this.releaseDistributedLock(lockKey, lockValue);
    }
  }

  /**
   * Generate recurring events directly (no queue), in batches
   */
  private async processRecurringEventsInBatches(): Promise<TaskMetrics> {
    const today = startOfUTCDay(new Date());
    let cursor: string | undefined = undefined;
    let totalProcessed = 0;
    let totalCreated = 0;
    let batchesQueued = 0; // kept for metrics compatibility

    const weekdayCode = (
      d: Date,
    ): 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' =>
      ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getUTCDay()] as any;

    while (true) {
      const experiences = await this.getExperiencesBatch(cursor);
      if (experiences.length === 0) break;

      for (const exp of experiences) {
        const rule: any = exp.recurrenceRules;
        if (!rule || !Array.isArray(rule.byday) || rule.byday.length === 0) {
          continue;
        }

        const windowDays =
          (typeof exp.openWindowDays === 'number' && exp.openWindowDays > 0
            ? exp.openWindowDays
            : typeof rule.openWindowDays === 'number' && rule.openWindowDays > 0
              ? rule.openWindowDays
              : this.bufferDays) ?? 30;

        const until = rule.until ? new Date(rule.until) : null;
        const windowLimit = addDaysUTC(today, windowDays);

        const maxDate = [until, windowLimit]
          .filter(Boolean)
          .reduce(
            (a: Date | null, b: Date | null) =>
              a && b ? (a < b ? a : b) : a || b,
            null as any,
          );
        if (!maxDate) continue;
        const lastEventDate = exp.events[0]?.date || null;
        let startDate = lastEventDate
          ? addDaysUTC(startOfUTCDay(new Date(lastEventDate)), 1)
          : today;
        if (startDate < today) startDate = today;

        const newEvents: any[] = [];
        for (
          let d = startOfUTCDay(startDate);
          d <= maxDate;
          d = addDaysUTC(d, 1)
        ) {
          const code = weekdayCode(d);
          if (rule.byday.includes(code)) {
            newEvents.push({
              experienceId: exp.id,
              title: exp.name,
              date: d,
              startTime: exp.startTime ?? null,
              endTime: exp.endTime ?? null,
              maxGuest: exp.maxGuest ?? 0,
              maxperSlot: exp.maxPerSlot ?? null,
              price: exp.price,
              discount: exp.discount,
              discountType: exp.discountType,
              duration: exp.duration,
              activities: exp.activities ?? undefined,
              timeslots: exp.timeslots ?? undefined,
              maxparticipants: exp.maxparticipants ?? null,
              availableTickets: exp.maxparticipants ?? null,
              notes: exp.notes ?? null,
            });
          }
        }

        if (newEvents.length) {
          const result = await this.prisma.events.createMany({
            data: newEvents,
            skipDuplicates: true,
          });
          totalCreated += Number(result?.count || 0);
          this.logger.debug(
            `Generated events for experience ${exp.id}: attempted=${newEvents.length}, inserted=${result?.count || 0}`,
          );
        } else {
          this.logger.debug(
            `No matching weekdays within window for experience ${exp.id}; byday=${JSON.stringify(
              rule.byday,
            )}`,
          );
        }
      }

      cursor = experiences[experiences.length - 1].id;
      totalProcessed += experiences.length;
      batchesQueued++;
    }

    return {
      totalProcessed,
      totalCreated,
      totalErrors: 0,
      batchesQueued,
      processingTimeMs: 0,
    };
  }

  /**
   * Get batch of experiences that need event generation
   */
  private async getExperiencesBatch(cursor?: string) {
    // Only RECURRING published, active experiences; pull minimal fields needed for generation
    const experiences = await this.prisma.experience.findMany({
      where: {
        status: 'PUBLISHED',
        isActive: true,
        deletedAt: null,
        scheduleType: 'RECURRING',
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      take: this.batchSize,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        openWindowDays: true,
        startTime: true,
        endTime: true,
        endDate: true,
        maxGuest: true,
        maxPerSlot: true,
        price: true,
        duration: true,
        discount: true,
        discountType: true,
        activities: true,
        timeslots: true,
        maxparticipants: true,
        notes: true,

        recurrenceRules: {
          select: {
            byday: true,
            until: true,
            openWindowDays: true,
          },
        },
        events: {
          take: 1,
          orderBy: { date: 'desc' },
          select: { date: true },
        },
      },
    });
    return experiences;
  }

  /**
   * Handle permanently failed jobs
   */
  private async handleFailedJob(experienceId: string, error: Error) {
    this.logger.error(
      `Permanently failed job for experience ${experienceId}`,
      error,
    );

    // Could implement:
    // - Store in dead letter table
    // - Send alert to monitoring system
    // - Mark experience for manual review

    try {
      await this.prisma.experience.update({
        where: { id: experienceId },
        data: {
          // Add a field to track failed generation attempts
          // lastGenerationError: error.message,
          // lastGenerationErrorAt: new Date(),
        },
      });
    } catch (updateError) {
      this.logger.error(
        `Failed to update experience after job failure: ${experienceId}`,
        (updateError as Error)?.stack,
      );
    }
  }

  /**
   * Distributed locking using Redis
   */
  private async acquireDistributedLock(
    key: string,
    value: string,
    ttl: number,
  ): Promise<boolean> {
    try {
      // Use BullMQ's Redis connection for distributed locking
      const redis = await this.eventQueue.client;
      const result = await redis.set(key, value, 'PX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(
        'Error acquiring distributed lock',
        (error as Error)?.stack,
      );
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  private async releaseDistributedLock(
    key: string,
    value: string,
  ): Promise<void> {
    try {
      const redis = await this.eventQueue.client;
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redis.eval(script, 1, key, value);
    } catch (error) {
      this.logger.error(
        'Error releasing distributed lock',
        (error as Error)?.stack,
      );
    }
  }

  /**
   * Store metrics for monitoring and alerting
   */
  private async storeMetrics(metrics: TaskMetrics): Promise<void> {
    try {
      // Could store in time-series database, metrics service, or simple table
      // Example: store in a metrics table or send to monitoring service

      this.logger.log(`Metrics stored: ${JSON.stringify(metrics)}`);

      // Example: Store in database
      // await this.prisma.taskMetrics.create({
      //   data: {
      //     taskName: 'recurring-events',
      //     metrics: metrics,
      //     timestamp: new Date(),
      //   },
      // });
    } catch (error) {
      this.logger.error('Error storing metrics', (error as Error)?.stack);
    }
  }

  /**
   * Manual trigger for recurring event generation (for admin use)
   */
  // async triggerRecurringEventGeneration(
  //   experienceId?: string,
  // ): Promise<TaskMetrics> {
  //   this.logger.log(
  //     `Manual trigger for recurring event generation${experienceId ? ` for experience: ${experienceId}` : ''}`,
  //   );

  //   if (experienceId) {
  //     // Process single experience
  //     const result =
  //       await this.eventService.ensureFifteenDayBuffer(experienceId);
  //     return {
  //       totalProcessed: 1,
  //       totalCreated: result.created,
  //       totalErrors: 0,
  //       batchesQueued: 0,
  //       processingTimeMs: 0,
  //     };
  //   } else {
  //     // Process all experiences
  //     return this.processRecurringEventsInBatches();
  //   }
  // }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats() {
    const waiting = await this.eventQueue.getWaiting();
    const active = await this.eventQueue.getActive();
    const completed = await this.eventQueue.getCompleted();
    const failed = await this.eventQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Manually trigger one run of recurring event processing with the same
   * distributed lock used by the cron. Useful for admin/testing.
   */
  async runRecurringOnce(): Promise<RunOnceResult> {
    const lockKey = 'recurring-events-cron-lock';
    const lockValue = `manual-${process.pid}-${Date.now()}`;

    const acquired = await this.acquireDistributedLock(
      lockKey,
      lockValue,
      LOCK_TTL,
    );
    if (!acquired) {
      return { started: false, message: 'Another instance is already running' };
    }

    if (this.isProcessing) {
      await this.releaseDistributedLock(lockKey, lockValue);
      return { started: false, message: 'Previous run still in progress' };
    }

    this.isProcessing = true;
    try {
      const startTime = Date.now();
      const metrics = await this.processRecurringEventsInBatches();
      metrics.processingTimeMs = Date.now() - startTime;
      await this.storeMetrics(metrics);
      return { started: true, metrics };
    } catch (err) {
      this.logger.error('Manual run failed', (err as Error)?.stack);
      return { started: false, message: (err as Error)?.message };
    } finally {
      this.isProcessing = false;
      await this.releaseDistributedLock(lockKey, lockValue);
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  @Cron('0 2 * * *') // Daily at 2 AM
  async cleanupOldJobs() {
    try {
      await this.eventQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // Keep completed jobs for 24 hours
      await this.eventQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // Keep failed jobs for 7 days
      this.logger.log('Queue cleanup completed');
    } catch (error) {
      this.logger.error('Error during queue cleanup', (error as Error)?.stack);
    }
  }

  // /**
  //  * Monthly auto payout for hosts with positive balances
  //  * TESTING: runs every 10 minutes (use '0 3 1 * *' for production monthly schedule)
  //  */
  // @Cron('*/10 * * * *')
  // async scheduleMonthlyHostAutoPayout() {
  //   const enabled = this.configService.get<string>('AUTO_PAYOUT_ENABLED');
  //   if (enabled && enabled.toLowerCase() === 'false') {
  //     this.logger.log('Testing auto payout is disabled via config');
  //     return;
  //   }

  //   const minAmount = Number(
  //     this.configService.get<string>('AUTO_PAYOUT_MIN_AMOUNT') ?? '10',
  //   );
  //   const lockKey = 'monthly-host-auto-payout-lock';
  //   const lockValue = `${process.pid}-${Date.now()}`;

  //   try {
  //     const acquired = await this.acquireDistributedLock(
  //       lockKey,
  //       lockValue,
  //       LOCK_TTL,
  //     );
  //     if (!acquired) {
  //       this.logger.warn('Another instance is already running auto payouts');
  //       return;
  //     }

  //     this.logger.log(
  //       `Starting monthly host auto payouts (minAmount=${minAmount})`,
  //     );

  //     // Identify candidate hosts: at least one successful booking payment
  //     const candidates = await this.prisma.transaction.findMany({
  //       where: {
  //         type: 'BOOKING_PAYMENT',
  //         status: 'SUCCESS',
  //       },
  //       distinct: ['payeeId'],
  //       select: { payeeId: true },
  //       take: 5000,
  //     });

  //     const hostIds = candidates
  //       .map((c) => c.payeeId)
  //       .filter((v): v is string => typeof v === 'string');

  //     if (hostIds.length === 0) {
  //       this.logger.log('No eligible hosts found for auto payout');
  //       return;
  //     }

  //     // Fetch hosts with connected Stripe accounts
  //     const hosts = await this.prisma.user.findMany({
  //       where: {
  //         id: { in: hostIds },
  //         stripeAccountId: { not: null },
  //         stripeOnboardingComplete: true,
  //       },
  //       select: { id: true, name: true, stripeAccountId: true },
  //     });

  //     let processed = 0;
  //     let payoutsCreated = 0;
  //     let skipped = 0;
  //     const errors: Array<{ hostId: string; error: string }> = [];

  //     for (const host of hosts) {
  //       processed++;
  //       try {
  //         const balance = await this.stripeService.getHostBalance(host.id);
  //         const available = Number(balance.availableBalance || 0);
  //         if (available >= minAmount) {
  //           const now = new Date();
  //           const memo = `Monthly auto payout ${now.getFullYear()}-${String(
  //             now.getMonth() + 1,
  //           ).padStart(2, '0')}`;

  //           await this.stripeService.processHostPayout({
  //             hostId: host.id,
  //             amount: available,
  //             currency: Currency.USD,
  //             description: memo,
  //           } as any);

  //           payoutsCreated++;
  //           this.logger.log(
  //             `Auto payout created for host ${host.id} (${host.name}) amount=${available}`,
  //           );
  //         } else {
  //           skipped++;
  //           this.logger.debug(
  //             `Host ${host.id} (${host.name}) skipped: available=${available} < min=${minAmount}`,
  //           );
  //         }
  //       } catch (err: any) {
  //         errors.push({ hostId: host.id, error: err?.message || String(err) });
  //         this.logger.error(
  //           `Failed auto payout for host ${host.id}: ${err?.message}`,
  //           err?.stack,
  //         );
  //       }
  //     }

  //     this.logger.log(
  //       `Monthly auto payout summary: candidates=${hostIds.length}, hosts=${hosts.length}, processed=${processed}, payouts=${payoutsCreated}, skipped=${skipped}, errors=${errors.length}`,
  //     );
  //   } catch (error) {
  //     this.logger.error('Auto payout job failed', (error as Error)?.stack);
  //   } finally {
  //     await this.releaseDistributedLock(lockKey, lockValue);
  //   }
  // }

  /**
   * Test queue connection by adding a simple test job
   */
  async testQueueConnection() {
    try {
      const testJob = await this.eventQueue.add(
        'test-job',
        {
          message: 'Queue connection test',
          timestamp: new Date().toISOString(),
        },
        {
          attempts: 1,
          removeOnComplete: 10,
          removeOnFail: 10,
        },
      );

      this.logger.log(`Test job queued: ${testJob.id}`);

      // Get current queue stats
      const stats = await this.getQueueStats();

      return {
        success: true,
        testJobId: testJob.id,
        queueStats: stats,
        message: 'Test job successfully queued',
      };
    } catch (error) {
      this.logger.error(
        'Queue connection test failed:',
        (error as Error)?.stack,
      );
      return {
        success: false,
        error: (error as Error)?.message,
        message: 'Queue connection test failed',
      };
    }
  }

  async onModuleDestroy() {
    this.logger.log('TasksService shutting down...');
    // No worker to close - EventProcessor handles queue consumption
  }
}
