import { Job } from 'bullmq';

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUES } from 'src/queues/queue.constants';
import { NotificationService } from './notification.service';

@Processor(QUEUES.NOTIFICATION)
@Injectable()
export class NotificationProcessor extends WorkerHost {
  private logger = new Logger(NotificationProcessor.name);

  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  /**
   * Process each notification job
   */
  async process(job: Job) {
    this.notificationService.notificationQueueListener(job);
  }
}
