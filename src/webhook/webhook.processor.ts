import { Job } from 'bullmq';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { QUEUES } from 'src/queues/queue.constants';
import { WebhookService } from './webhook.service';
import Stripe from 'stripe';

@Processor(QUEUES.WEBHOOK)
@Injectable()
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const event = job.data?.event as Stripe.Event | undefined;
    if (!event) {
      this.logger.error(`Job ${job.id} missing Stripe event payload`);
      return;
    }

    this.logger.log(
      `Processing webhook job ${job.id}: ${event.type} (ID: ${event.id})`,
    );

    await this.webhookService.processWebhookJob(event);

    this.logger.log(
      `Completed webhook job ${job.id}: ${event.type} (ID: ${event.id})`,
    );

    return { ok: true };
  }
}
