import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';

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

  async onModuleDestroy() {
    this.logger.log('TasksService shutting down...');
    // No worker to close - EventProcessor handles queue consumption
  }
}
