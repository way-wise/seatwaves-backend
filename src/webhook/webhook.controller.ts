import {
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { WebhookService } from './webhook.service';

@ApiTags('Stripe Webhooks')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly stripe: Stripe;

  constructor(private readonly webhookService: WebhookService) {
    // Use default SDK API version or pin to a stable version supported by the SDK
    // Pinning example: { apiVersion: '2020-08-27' }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  @Post('stripe')
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or payload',
  })
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new HttpException(
        'Webhook secret not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    if (!signature) {
      this.logger.error('Missing Stripe signature header');
      throw new HttpException(
        'Missing signature header',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Temporary diagnostics (masked)
    const secretLen = webhookSecret?.length || 0;
    const sigLen = signature?.length || 0;
    this.logger.debug(
      `Diag: webhookSecretLen=${secretLen}, signatureLen=${sigLen}`,
    );

    // Use NestJS rawBody (enabled with { rawBody: true })
    const rawBody = request.rawBody;

    if (!rawBody) {
      this.logger.error('Missing raw body');
      throw new HttpException('Missing raw body', HttpStatus.BAD_REQUEST);
    }

    this.logger.debug(
      `Raw body type: ${typeof rawBody}, isBuffer: ${Buffer.isBuffer(rawBody)}, length: ${rawBody.length}`,
    );

    let event: Stripe.Event;

    try {
      // Verify webhook signature using raw body
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error.message}`,
      );
      throw new HttpException(
        `Webhook signature verification failed: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Verified webhook event: ${event.type} (ID: ${event.id})`);

    try {
      // Enqueue the webhook event for async processing
      await this.webhookService.enqueueWebhookEvent(event);
      this.logger.log(
        `Enqueued webhook event: ${event.type} (ID: ${event.id})`,
      );
      return { received: true, eventId: event.id, enqueued: true };
    } catch (error) {
      this.logger.error(
        `Failed to process webhook event ${event.type} (ID: ${event.id}): ${error.message}`,
        error.stack,
      );

      // Return 200 to prevent Stripe retries for business logic errors
      // Only return 4xx/5xx for actual webhook processing errors
      if (
        error.message.includes('already processed') ||
        error.message.includes('not found')
      ) {
        return { received: true, eventId: event.id, warning: error.message };
      }

      throw new HttpException(
        `Webhook processing failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //Get All Webhook Events
  @Get()
  // @UseGuards(AuthGuard('jwt'))
  // @Permissions('webhook.read')
  findAll() {
    return this.webhookService.findWebhookEvents();
  }
}
