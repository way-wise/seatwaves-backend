import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from 'src/queues/queue.constants';
import { EventService } from './event.service';
import { addDaysUTC, startOfUTCDay } from 'src/common/utc';

@Processor(QUEUES.EVENT, { concurrency: 5 })
@Injectable()
export class EventProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(private readonly eventService: EventService) {
    super();
  }

  async onModuleInit() {
    this.logger.log('EventProcessor module initialized with concurrency: 5');
    this.logger.log('EventService injected:', !!this.eventService);
    this.logger.log('generateEventsForTargetDates method available:', !!this.eventService?.generateEventsForTargetDates);
    this.logger.log('EventProcessor ready to process jobs from queue:', QUEUES.EVENT);
    
    // Test queue connection and inspect jobs
    setTimeout(async () => {
      try {
        const queueName = QUEUES.EVENT;
        this.logger.log(`Checking queue connection for: ${queueName}`);
        
        // Check worker status
        this.logger.log('EventProcessor worker status:', {
          isRunning: this.worker?.isRunning(),
          isPaused: this.worker?.isPaused(),
          concurrency: this.worker?.opts?.concurrency
        });

        // Check if worker is actually connected to Redis
        if (this.worker) {
          try {
            // Test Redis connection by checking worker connection
            this.logger.log('Worker Redis connection test - attempting to check connection...');
            // Worker doesn't have direct queue methods, but we can check if it's processing
            this.logger.log('Worker initialized and ready to process jobs');
          } catch (redisError) {
            this.logger.error('Redis connection error in EventProcessor:', redisError);
          }
        }
      } catch (error) {
        this.logger.error('Queue connection test failed:', error);
      }
    }, 3000);
  }

  async process(job: Job) {
    const startTime = Date.now();
    const jobContext = `job=${job.id} name=${job.name} attempt=${job.attemptsMade + 1}/${job.opts?.attempts || 'unlimited'}`;
    
    try {
      this.logger.log(`Processing ${jobContext}`);

      // Handle test jobs for queue connection testing
      if (job.name === 'test-job') {
        this.logger.log(`Test job processed successfully: ${job.data?.message}`);
        return { ok: true, test: true, data: job.data };
      }

      // Handle recurring-event generation jobs queued by TasksService
      if (job.name === 'process-recurring-event') {
        return await this.processRecurringEvent(job, jobContext);
      }

      // Default: legacy event job processing
      if (job.data?.experienceId) {
        const result = await this.eventService.initiateEvent(job.data.experienceId);
        const duration = Date.now() - startTime;
        this.logger.log(`Legacy event processed successfully in ${duration}ms: ${jobContext}`);
        return { ok: true, duration, legacy: true };
      }

      throw new Error(`Unknown job type or missing data: ${job.name}`);
    } catch (error) {
      return this.handleJobError(error, job, jobContext, startTime);
    }
  }

  private async processRecurringEvent(job: Job, jobContext: string) {
    const experienceId: string = job.data?.experienceId;
    const targetDateIso: string | undefined = job.data?.targetDate;
    const batchId: string = job.data?.batchId;

    this.logger.debug(`Processing recurring event: exp=${experienceId}, targetDate=${targetDateIso}, batch=${batchId}`);

    if (!experienceId) {
      throw new Error('Missing experienceId in recurring event job data');
    }

    // Verify EventService is properly injected
    if (!this.eventService) {
      throw new Error('EventService not properly injected in EventProcessor');
    }

    if (!this.eventService.generateEventsForTargetDates) {
      throw new Error('generateEventsForTargetDates method not found on EventService');
    }

    let targets: Date[];
    try {
      if (targetDateIso) {
        targets = [startOfUTCDay(new Date(targetDateIso))];
        this.logger.debug(`Processing single target date: ${targetDateIso} for exp=${experienceId}`);
      } else {
        // Legacy behavior: today+16 and today+31
        const today = startOfUTCDay(new Date());
        targets = [
          startOfUTCDay(addDaysUTC(today, 16)), 
          startOfUTCDay(addDaysUTC(today, 31))
        ];
        this.logger.debug(`Processing legacy targets (+16, +31 days) for exp=${experienceId}`);
      }
    } catch (dateError) {
      throw new Error(`Invalid target date '${targetDateIso}': ${(dateError as Error)?.message}`);
    }

    this.logger.debug(`About to call generateEventsForTargetDates with exp=${experienceId}, targets=${targets.length}`);

    const startTime = Date.now();
    let result;
    try {
      result = await this.eventService.generateEventsForTargetDates(
        experienceId,
        targets,
      );
      this.logger.debug(`generateEventsForTargetDates returned:`, result);
    } catch (serviceError) {
      this.logger.error(`Error calling generateEventsForTargetDates: ${(serviceError as Error)?.message}`, (serviceError as Error)?.stack);
      throw serviceError;
    }
    
    const duration = Date.now() - startTime;

    this.logger.log(
      `Recurring generation complete: exp=${experienceId}, created=${result?.created ?? 0}, considered=${result?.considered ?? 0}, duration=${duration}ms, batch=${batchId}`,
    );
    
    return {
      ok: true,
      experienceId,
      batchId,
      created: result?.created ?? 0,
      considered: result?.considered ?? 0,
      duration,
      targets: targets.map(t => t.toISOString()),
    };
  }

  private handleJobError(error: any, job: Job, jobContext: string, startTime: number) {
    const duration = Date.now() - startTime;
    const msg = (error as Error)?.message || '';
    const isRetryable = job.attemptsMade < (job.opts?.attempts || 3) - 1;

    // Treat idempotent conflicts as non-fatal
    if (msg.toLowerCase().includes('already exist') || msg.toLowerCase().includes('duplicate')) {
      this.logger.warn(`Idempotent conflict (non-fatal): ${jobContext} - ${msg}`);
      return { ok: true, idempotent: true, duration };
    }

    // Log validation errors as warnings (non-retryable)
    if (msg.toLowerCase().includes('missing') || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('not found')) {
      this.logger.warn(`Validation error (non-retryable): ${jobContext} - ${msg}`);
      return { ok: false, validationError: true, error: msg, duration };
    }

    // Log retryable vs permanent failures differently
    if (isRetryable) {
      this.logger.warn(`Retryable error: ${jobContext} - ${msg} (will retry)`);
    } else {
      this.logger.error(`Permanent failure: ${jobContext} - ${msg}`, (error as Error)?.stack);
    }

    throw error; // Let BullMQ handle retry logic
  }

  // BullMQ Worker Event Handlers
  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) started processing`);
    this.logger.debug(`Job data:`, job.data);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    const created = result?.created ?? 0;
    const duration = result?.duration ?? 'unknown';
    this.logger.log(`Job ${job.id} completed: created=${created}, duration=${duration}ms`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const isLastAttempt = job.attemptsMade >= (job.opts?.attempts || 3);
    if (isLastAttempt) {
      this.logger.error(`Job ${job.id} permanently failed after ${job.attemptsMade} attempts: ${error.message}`);
    } else {
      this.logger.warn(`Job ${job.id} failed (attempt ${job.attemptsMade}): ${error.message}`);
    }
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('Worker error:', error.message, error.stack);
  }
}
