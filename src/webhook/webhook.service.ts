import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import {
  TransactionStatus,
  BookingStatus,
  TransactionType,
  PaymentProvider,
  Currency,
  NotificationType,
  PointRuleAction,
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from 'src/queues/queue.constants';
import { NotificationService } from 'src/notification/notification.service';
import { ActivityService } from 'src/activity/activity.service';
import { PointsService } from 'src/points/points.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly pointsService: PointsService,
    private readonly activityService: ActivityService,
    @InjectQueue(QUEUES.WEBHOOK) private readonly webhookQueue: Queue,
  ) {}

  /**
   * Enqueue verified Stripe event for async processing (idempotent)
   */
  async enqueueWebhookEvent(event: Stripe.Event): Promise<void> {
    const eventId = event.id;
    // Ensure idempotency record exists; if already PROCESSED, skip
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { stripeEventId: eventId },
    });

    if (existing?.status === 'PROCESSED') {
      this.logger.warn(`Event ${eventId} already processed, skipping enqueue`);
      return;
    }

    if (!existing) {
      await this.prisma.webhookEvent.create({
        data: {
          stripeEventId: eventId,
          type: event.type,
          status: 'PENDING',
          payload: event as any,
        },
      });
    }

    await this.webhookQueue.add(
      'stripe-webhook',
      { event },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
        jobId: eventId, // dedupe in queue
      },
    );

    this.logger.log(`Enqueued webhook event ${event.type} (${eventId})`);
  }

  /**
   * Process a webhook job. Ensures idempotency via DB row and updates status.
   */
  async processWebhookJob(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook job: ${event.type} (ID: ${event.id})`);

    const record = await this.prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (record && record.status === 'PROCESSED') {
      this.logger.warn(`Event ${event.id} already processed, skipping job`);
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCancelled(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'transfer.created':
          await this.handleTransferCreated(
            event.data.object as Stripe.Transfer,
          );
          break;

        case 'application_fee.created':
          await this.handleApplicationFeeCreated(
            event.data.object as Stripe.ApplicationFee,
          );
          break;

        case 'payout.paid':
          await this.handlePayoutPaid(event.data.object as Stripe.Payout);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        case 'charge.refund.updated':
          await this.handleChargeRefundUpdated(
            event.data.object as Stripe.Refund,
          );
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      await this.prisma.webhookEvent.upsert({
        where: { stripeEventId: event.id },
        create: {
          stripeEventId: event.id,
          type: event.type,
          status: 'PROCESSED',
          processedAt: new Date(),
          payload: event as any,
        },
        update: { status: 'PROCESSED', processedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`Error processing event ${event.id}: ${error.message}`);
      await this.prisma.webhookEvent.upsert({
        where: { stripeEventId: event.id },
        create: {
          stripeEventId: event.id,
          type: event.type,
          status: 'FAILED',
          processedAt: new Date(),
          error: error.message,
          payload: event as any,
        },
        update: {
          status: 'FAILED',
          processedAt: new Date(),
          error: error.message,
        },
      });
      throw error;
    }
  }

  /**
   * Handle successful checkout session completion
   * Creates booking + transaction with PAID status
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.log(
      `Processing checkout.session.completed for session: ${session.id}`,
    );

    // Prefer Payment Intent ID for mapping to our transaction
    const sessionId = session.id;

    await this.prisma.$transaction(async (tx) => {
      // Find existing transaction by payment intent
      const transaction = await tx.transaction.findFirst({
        where: { externalTxnId: sessionId || '' },
        include: { booking: true },
      });

      if (!transaction) {
        // Fallback: many flows initially stored session.id instead of payment_intent
        this.logger.warn(
          `No transaction by payment_intent. Falling back to session lookup: ${session.id}`,
        );
        return;
      }

      if (session.payment_intent) {
        await tx.transaction.update({
          where: { id: transaction?.id },
          data: { stripePaymentIntent: session.payment_intent as string },
        });
      }

      // Update transaction status to SUCCESS
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          processedAt: new Date(),
          metadata: {
            ...((transaction.metadata as object) || {}),
            checkoutSessionId: session.id,
            stripeCustomerId:
              typeof session.customer === 'string' ? session.customer : null,
          },
        },
      });

      // Update booking status to CONFIRMED
      if (transaction.booking) {
        await tx.booking.update({
          where: { id: transaction.booking.id },
          data: {
            status: BookingStatus.CONFIRMED,
            updatedAt: new Date(),
          },
        });
      }

      // Ensure we have definite strings for notification recipients and links
      const bookingUserId = transaction.payerId;
      const hostId = transaction.payeeId;
      const bookingId = transaction.booking?.id;

      if (!bookingUserId || !bookingId || !hostId) {
        this.logger.warn(
          `Skipping notifications: missing booking user or booking id for transaction ${transaction.id}`,
        );
        return;
      }

      // Award points to booking user
      await this.pointsService.awardPoints({
        userId: bookingUserId,
        action: PointRuleAction.BOOKING,
        amountCents: Math.round(Number(transaction.amount) * 100),
        referencedId: bookingId,
        reason: 'Booking confirmed',
      });

      this.notificationService.createAndQueueNotification(bookingUserId, {
        type: NotificationType.BOOKING,
        title: 'Booking Confirmed',
        message: `Your booking ${bookingId} was confirmed by the host.`,
        link: `/users/booking/${bookingId}`,
      });

      this.notificationService.createAndQueueNotification(hostId, {
        type: NotificationType.BOOKING,
        title: 'Booking Confirmed',
        message: `A booking (${bookingId}) for your experience was confirmed by the guest.`,
        link: `/host/bookings`,
      });

      this.activityService.log({
        userId: bookingUserId,
        type: 'BOOKING',
        action: 'BOOKING_CONFIRMED',
        metadata: JSON.stringify({
          transactionId: transaction.id,
          bookingId,
          hostId,
          experienceId: transaction.booking?.experienceId,
          eventId: transaction.booking?.eventId,
        }),
        ipAddress: 'Webhook',
      });
      this.logger.log(
        `Updated transaction ${transaction.id} and booking ${transaction.booking?.id} to CONFIRMED`,
      );
    });
  }

  /**
   * Handle expired checkout session
   * Updates booking status to FAILED
   *
   */
  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
    this.logger.log(`Processing checkout.session.expired: ${session.id}`);
    const sessionId = session.id;

    await this.prisma.$transaction(async (tx) => {
      // Find the related transaction/booking
      const txn = await tx.transaction.findFirst({
        where: {
          OR: [
            { externalTxnId: sessionId },
            { stripePaymentIntent: session.payment_intent as string },
          ],
        },
        include: { booking: { include: { event: true } } },
      });

      if (!txn) {
        this.logger.warn(
          `No transaction found for expired session ${sessionId}. Nothing to update`,
        );
        return;
      }

      // Update transaction status
      await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: TransactionStatus.FAILED,
          processedAt: new Date(),
          metadata: {
            ...((txn.metadata as object) || {}),
            checkoutSessionExpiredAt: new Date().toISOString(),
          },
        },
      });

      const booking = txn.booking;
      if (!booking) return;

      // If already moved out of PENDING by a race with success, do not revert
      if (booking.status !== BookingStatus.PENDING) {
        this.logger.log(
          `Booking ${booking.id} status is ${booking.status}; skip EXPIRED + ticket release`,
        );
        return;
      }

      // Mark booking as EXPIRED
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.EXPIRED, updatedAt: new Date() },
      });

      // Release tickets idempotently using a guard in transaction metadata
      const ticketsAlreadyReleased = Boolean(
        (txn.metadata as any)?.ticketsReleased,
      );

      if (booking.eventId && !ticketsAlreadyReleased) {
        const event = await tx.events.findUnique({
          where: { id: booking.eventId },
        });

        if (event) {
          const newAvailable = Math.min(
            (event.availableTickets ?? 0) + (booking.guestCount || 0),
            event.maxparticipants || (event.availableTickets ?? 0),
          );

          await tx.events.update({
            where: { id: event.id },
            data: { availableTickets: newAvailable },
          });

          await tx.transaction.update({
            where: { id: txn.id },
            data: {
              metadata: {
                ...((txn.metadata as object) || {}),
                ticketsReleased: true,
                ticketsReleasedReason: 'checkout.session.expired',
                ticketsReleasedAt: new Date().toISOString(),
                releasedCount: booking.guestCount,
              },
            },
          });
        }
      }

      // Notify guest and host
      const guestId = txn.payerId;
      const hostId = txn.payeeId;
      const bookingId = booking.id;

      if (guestId) {
        await this.notificationService.createAndQueueNotification(guestId, {
          type: NotificationType.BOOKING,
          title: 'Booking Payment Expired',
          message: `Your payment session expired. Booking ${bookingId} was not confirmed.`,
          link: `/users/booking/${bookingId}`,
        });
      }
      if (hostId) {
        await this.notificationService.createAndQueueNotification(hostId, {
          type: NotificationType.BOOKING,
          title: 'Guest Payment Expired',
          message: `A guest's payment session expired for booking ${bookingId}. Tickets have been released.`,
          link: `/host/bookings`,
        });
      }
    });
  }

  /**
   * Handle payment intent failed
   * Updates booking status to FAILED
   *
   */
  private async handlePaymentIntentFailed(intent: Stripe.PaymentIntent) {
    this.logger.log(`Processing payment_intent.failed: ${intent.id}`);
    await this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findFirst({
        where: { stripePaymentIntent: intent.id },
        include: { booking: true },
      });

      if (!txn) {
        this.logger.warn(
          `No transaction found for failed payment intent ${intent.id}`,
        );
        return;
      }

      await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: TransactionStatus.FAILED,
          processedAt: new Date(),
          metadata: {
            ...((txn.metadata as object) || {}),
            paymentFailedAt: new Date().toISOString(),
            lastPaymentError: (intent.last_payment_error as any)?.message,
          },
        },
      });

      const booking = txn.booking;
      if (!booking) return;

      if (booking.status === BookingStatus.PENDING) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED, updatedAt: new Date() },
        });

        // Release tickets idempotently
        const ticketsAlreadyReleased = Boolean(
          (txn.metadata as any)?.ticketsReleased,
        );
        if (booking.eventId && !ticketsAlreadyReleased) {
          const event = await tx.events.findUnique({
            where: { id: booking.eventId },
          });
          if (event) {
            const newAvailable = Math.min(
              (event.availableTickets ?? 0) + (booking.guestCount || 0),
              event.maxparticipants || (event.availableTickets ?? 0),
            );
            await tx.events.update({
              where: { id: event.id },
              data: { availableTickets: newAvailable },
            });
            await tx.transaction.update({
              where: { id: txn.id },
              data: {
                metadata: {
                  ...((txn.metadata as object) || {}),
                  ticketsReleased: true,
                  ticketsReleasedReason: 'payment_intent.payment_failed',
                  ticketsReleasedAt: new Date().toISOString(),
                  releasedCount: booking.guestCount,
                },
              },
            });
          }
        }
      }

      // Notify guest
      if (txn.payerId) {
        await this.notificationService.createAndQueueNotification(txn.payerId, {
          type: NotificationType.PAYMENT,
          title: 'Payment Failed',
          message: `Your payment for booking ${booking.id} failed. Please try again with a different method.`,
          link: `/users/booking/${booking.id}`,
        });
      }
    });
  }

  /**
   * Handle Payment intent cancelled
   * Updates booking status to FAILED
   *
   */
  private async handlePaymentIntentCancelled(intent: Stripe.PaymentIntent) {
    this.logger.log(`Processing payment_intent.cancelled: ${intent.id}`);
    await this.prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.findFirst({
        where: { stripePaymentIntent: intent.id },
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              eventId: true,
              guestCount: true,
              event: {
                select: {
                  maxparticipants: true,
                },
              },
            },
          },
        },
      });

      if (!txn) {
        this.logger.warn(
          `No transaction found for cancelled payment intent ${intent.id}`,
        );
        return;
      }

      await tx.transaction.update({
        where: { id: txn.id },
        data: {
          status: TransactionStatus.CANCELLED,
          processedAt: new Date(),
          metadata: {
            ...((txn.metadata as object) || {}),
            paymentCancelledAt: new Date().toISOString(),
            cancellationReason:
              (intent.cancellation_reason as any) || 'user_cancelled',
          },
        },
      });

      const booking = txn.booking;
      if (!booking) return;

      if (booking.status === BookingStatus.PENDING) {
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED, updatedAt: new Date() },
        });

        // Release tickets idempotently
        const ticketsAlreadyReleased = Boolean(
          (txn.metadata as any)?.ticketsReleased,
        );
        if (booking.eventId && !ticketsAlreadyReleased) {
          const event = await tx.events.findUnique({
            where: { id: booking.eventId },
          });
          if (event) {
            const newAvailable = Math.min(
              (event.availableTickets ?? 0) + (booking.guestCount || 0),
              event.maxparticipants || (event.availableTickets ?? 0),
            );
            await tx.events.update({
              where: { id: event.id },
              data: { availableTickets: newAvailable },
            });
            await tx.transaction.update({
              where: { id: txn.id },
              data: {
                metadata: {
                  ...((txn.metadata as object) || {}),
                  ticketsReleased: true,
                  ticketsReleasedReason: 'payment_intent.canceled',
                  ticketsReleasedAt: new Date().toISOString(),
                  releasedCount: booking.guestCount,
                },
              },
            });
          }
        }
      }

      // Notify guest
      if (txn.payerId) {
        await this.notificationService.createAndQueueNotification(txn.payerId, {
          type: NotificationType.PAYMENT,
          title: 'Payment Cancelled',
          message: `Your payment for booking ${booking.id} was cancelled.`,
          link: `/users/booking/${booking.id}`,
        });
      }
    });
  }

  /**
   * Handle application fee created (Stripe platform commission)
   * Creates an ADMIN_COMMISSION transaction linked to the original booking transaction
   */
  private async handleApplicationFeeCreated(
    fee: Stripe.ApplicationFee,
  ): Promise<void> {
    this.logger.log(`Processing application_fee.created: ${fee.id}`);

    await this.prisma.$transaction(async (tx) => {
      const feeAmount = (fee.amount || 0) / 100; // cents -> major units
      const currencyCode = (fee.currency || 'usd').toUpperCase();
      const chargeId = typeof fee.charge === 'string' ? fee.charge : undefined;

      // Idempotency: existing ADMIN_COMMISSION for this fee or charge
      const existing = await tx.transaction.findFirst({
        where: {
          OR: [
            { externalTxnId: fee.id },
            chargeId
              ? {
                  AND: [
                    { stripeChargeId: chargeId },
                    { type: TransactionType.ADMIN_COMMISSION },
                  ],
                }
              : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (existing) {
        await tx.transaction.update({
          where: { id: existing.id },
          data: {
            status: TransactionStatus.SUCCESS,
            processedAt: existing.processedAt ?? new Date(),
            settledAt: existing.settledAt ?? new Date(),
            metadata: {
              ...((existing.metadata as object) || {}),
              applicationFeeId: fee.id,
              applicationId:
                typeof fee.application === 'string' ? fee.application : null,
            },
          },
        });
        this.logger.log(
          `ADMIN_COMMISSION already exists for fee ${fee.id}; updated transaction ${existing.id}`,
        );
        return;
      }

      // Find parent booking transaction via chargeId if available
      let parent: {
        id: string;
        experienceId: string | null;
        bookingId: string | null;
      } | null = null;
      if (chargeId) {
        parent = await tx.transaction.findFirst({
          where: {
            stripeChargeId: chargeId,
            type: TransactionType.BOOKING_PAYMENT,
          },
          select: { id: true, experienceId: true, bookingId: true },
        });
      }

      // Determine host (payer) from experience if available
      let payerId: string | null = null;
      if (parent?.experienceId) {
        const exp = await tx.experience.findUnique({
          where: { id: parent.experienceId },
          select: { userId: true },
        });
        payerId = exp?.userId ?? null;
      }

      const created = await tx.transaction.create({
        data: {
          type: TransactionType.ADMIN_COMMISSION,
          status: TransactionStatus.SUCCESS,
          amount: feeAmount,
          currency: (Currency as any)[currencyCode] ?? Currency.USD,
          provider: PaymentProvider.STRIPE_CONNECT,
          payerId, // Host as the economic source of the fee when identifiable
          payeeId: null, // Platform; left null if no platform user entity
          experienceId: parent?.experienceId ?? undefined,
          bookingId: parent?.bookingId ?? undefined,
          parentTransactionId: parent?.id ?? undefined,
          stripeChargeId: chargeId,
          externalTxnId: fee.id,
          description: 'Application fee (platform commission)',
          processedAt: new Date(),
          settledAt: new Date(),
          metadata: {
            source: 'webhook.application_fee.created',
            applicationFeeId: fee.id,
            chargeId,
            applicationId:
              typeof fee.application === 'string' ? fee.application : null,
            originAccountId:
              typeof fee.account === 'string' ? fee.account : null,
          },
        },
      });

      this.logger.log(
        `Created ADMIN_COMMISSION transaction ${created.id} for application fee ${fee.id}`,
      );
    });
  }

  /**
   * Handle successful payment intent
   * Confirms payment and records transaction
   */
  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    this.logger.log(`Processing payment_intent.succeeded: ${paymentIntent}`);

    const transaction = await this.prisma.transaction.findFirst({
      where: { stripePaymentIntent: paymentIntent.id },
      include: { booking: true },
    });

    if (!transaction) {
      this.logger.warn(
        `Transaction not found for payment intent: ${paymentIntent.id}`,
      );
      return;
    }

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.SUCCESS,
        processedAt: new Date(),
        settledAt: new Date(),
        stripeChargeId: paymentIntent.latest_charge as string,
        stripeTransferId: paymentIntent.transfer_group as string,
        metadata: {
          ...((transaction.metadata as object) || {}),
          stripePaymentMethod:
            typeof paymentIntent.payment_method === 'string'
              ? paymentIntent.payment_method
              : null,
          receiptUrl: paymentIntent.receipt_email,
        },
        booking: {
          update: {
            status: BookingStatus.CONFIRMED,
            updatedAt: new Date(),
          },
        },
      },
    });

    // Ensure we have definite strings for notification recipients and links
    const bookingUserId = transaction.payerId;
    const hostId = transaction.payeeId;
    const bookingId = transaction.booking?.id;

    if (!bookingUserId || !bookingId || !hostId) {
      this.logger.warn(
        `Skipping notifications: missing booking user or booking id for transaction ${transaction.id}`,
      );
      return;
    }

    await this.notificationService.createAndQueueNotification(bookingUserId, {
      type: NotificationType.BOOKING,
      title: 'Booking Confirmed',
      message: `Your booking ${bookingId} was confirmed by the host.`,
      link: `/users/booking/${bookingId}`,
    });

    await this.notificationService.createAndQueueNotification(hostId, {
      type: NotificationType.BOOKING,
      title: 'Booking Confirmed',
      message: `A booking (${bookingId}) for your experience was confirmed by the guest.`,
      link: `/host/bookings`,
    });

    this.activityService.log({
      userId: bookingUserId,
      type: 'BOOKING',
      action: 'BOOKING_CONFIRMED',
      metadata: JSON.stringify({
        transactionId: transaction.id,
        bookingId,
        hostId,
        experienceId: transaction.booking?.experienceId,
        eventId: transaction.booking?.eventId,
      }),
      ipAddress: 'Webhook',
    });

    this.logger.log(`Payment confirmed for transaction ${transaction.id}`);
  }

  /**
   * Handle transfer creation to connected account
   * Updates withdrawal request and transaction status
   */
  private async handleTransferCreated(
    transfer: Stripe.Transfer,
  ): Promise<void> {
    this.logger.log(`Processing transfer.created: ${transfer.id}`);

    await this.prisma.$transaction(async (tx) => {
      // Direct payout mode: skip any WithdrawalRequest updates
      this.logger.log(
        `Direct payout mode active; skipping WithdrawalRequest update for transfer ${transfer.id}`,
      );

      // Find transaction by:
      // 1) stored transferId
      // 2) source charge id (transfer.source_transaction)
      // 3) transfer_group (if we ever stored it in stripePaymentIntent)
      const sourceChargeId =
        typeof transfer.source_transaction === 'string'
          ? transfer.source_transaction
          : undefined;

      const transferGroup = (transfer as any).transfer_group as
        | string
        | undefined;

      const transaction = await tx.transaction.findFirst({
        where: {
          OR: [
            { stripeTransferId: transfer.id },
            sourceChargeId ? { stripeChargeId: sourceChargeId } : undefined,
            transferGroup ? { stripePaymentIntent: transferGroup } : undefined,
          ].filter(Boolean) as any,
        },
      });

      if (transaction) {
        // Update transaction status and backfill transferId if missing
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            settledAt: new Date(),
            processedAt: new Date(),
            stripeTransferId: transaction.stripeTransferId ?? transfer.id,
            metadata: {
              ...((transaction.metadata as object) || {}),
              transferCreatedAt: new Date().toISOString(),
              destinationAccount:
                typeof transfer.destination === 'string'
                  ? transfer.destination
                  : null,
              transferAmount: transfer.amount / 100,
              transferCurrency: transfer.currency,
              transferDescription: (transfer as any).description || undefined,
              sourceChargeId,
              transferGroup,
            },
          },
        });

        this.logger.log(`Host payout transaction ${transaction.id} completed`);
      } else {
        // Create a HOST_PAYOUT transaction if none exists, using destination account mapping to host
        const destinationAccount =
          typeof transfer.destination === 'string'
            ? transfer.destination
            : undefined;

        if (!destinationAccount) {
          this.logger.warn(
            `Transfer ${transfer.id} has no destination account; cannot create HOST_PAYOUT transaction`,
          );
          return;
        }

        const host = await tx.user.findFirst({
          where: { stripeAccountId: destinationAccount },
          select: { id: true },
        });

        if (!host) {
          this.logger.warn(
            `No host user mapped to destination account ${destinationAccount} for transfer ${transfer.id}`,
          );
          return;
        }

        // Try to link to original booking transaction (parent) if we can identify via source charge or transfer group
        const parent = await tx.transaction.findFirst({
          where: {
            OR: [
              sourceChargeId ? { stripeChargeId: sourceChargeId } : undefined,
              transferGroup
                ? { stripePaymentIntent: transferGroup }
                : undefined,
            ].filter(Boolean) as any,
            type: TransactionType.BOOKING_PAYMENT,
          },
          select: {
            id: true,
            experienceId: true,
            bookingId: true,
            currency: true,
            payerId: true,
          },
        });

        const amount = (transfer.amount || 0) / 100;
        const currency = (transfer.currency || 'usd').toUpperCase();

        const created = await tx.transaction.create({
          data: {
            type: TransactionType.HOST_PAYOUT,
            status: TransactionStatus.SUCCESS,
            amount,
            currency: (Currency as any)[currency] ?? Currency.USD,
            provider: PaymentProvider.STRIPE_CONNECT,
            payerId: null, // Platform as payer; left null if no explicit platform user
            payeeId: host.id,
            experienceId: parent?.experienceId ?? undefined,
            bookingId: parent?.bookingId ?? undefined,
            parentTransactionId: parent?.id ?? undefined,
            stripeTransferId: transfer.id,
            stripeAccountId: destinationAccount,
            stripeChargeId: sourceChargeId,
            description: (transfer as any).description || 'Host payout',
            processedAt: new Date(),
            settledAt: new Date(),
            metadata: {
              source: 'webhook.transfer.created',
              sourceChargeId,
              transferGroup,
              destinationAccount,
              transferAmount: amount,
              transferCurrency: currency,
            },
          },
        });

        this.activityService.log({
          userId: host.id,
          type: 'HOST',
          action: 'HOST_PAYOUT',
          metadata: JSON.stringify({
            transactionId: created.id,
            bookingId: parent?.bookingId ?? undefined,
            experienceId: parent?.experienceId ?? undefined,
          }),
          ipAddress: 'Webhook',
        });

        this.logger.log(
          `Created HOST_PAYOUT transaction ${created.id} for transfer ${transfer.id} to host ${host.id}`,
        );
      }
    });
  }

  /**
   * Handle successful payout to host
   * Marks host payout as complete
   */
  private async handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
    this.logger.log(`Processing payout.paid: ${payout.id}`);

    await this.prisma.$transaction(async (tx) => {
      // Note: Payouts are automatic from Stripe balances to bank accounts
      // We need to find related transfers that funded this payout
      // For now, we'll log the payout completion for monitoring

      this.logger.log(
        `Payout ${payout.id} completed - ${payout.amount / 100} ${payout.currency} sent to ${payout.destination}`,
      );

      // You may want to update any related withdrawal requests or transactions
      // based on your specific business logic for tracking payouts
    });
  }

  /**
   * Handle charge refund
   * Updates transaction + booking status to REFUNDED
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Processing charge.refunded: ${charge.id}`);

    await this.prisma.$transaction(async (tx) => {
      // Find original transaction by charge ID
      const originalTransaction = await tx.transaction.findFirst({
        where: { stripeChargeId: charge.id },
        include: { booking: true },
      });

      if (!originalTransaction) {
        this.logger.warn(
          `Original transaction not found for charge: ${charge.id}`,
        );
        return;
      }

      // Process each refund individually: update existing refund transactions only (do not create new)
      const refunds = charge.refunds?.data ?? [];
      for (const refund of refunds) {
        const refundId = refund.id;
        const amount = (refund.amount ?? 0) / 100;

        const existingRefundTxn = await tx.transaction.findFirst({
          where: { externalTxnId: refundId },
          select: { id: true },
        });

        if (!existingRefundTxn) {
          // We did not initiate this refund via our service (or it predates our logic). Do not create; just log for observability.
          this.logger.warn(
            `Refund ${refundId} for charge ${charge.id} has no matching transaction record; skipping creation per design`,
          );
          continue;
        }

        await tx.transaction.update({
          where: { id: existingRefundTxn.id },
          data: {
            status: TransactionStatus.SUCCESS,
            amount,
            settledAt: new Date(),
            processedAt: new Date(),
            metadata: {
              refundId,
              refundReason: (refund as any).reason || 'requested_by_customer',
              originalChargeId: charge.id,
              status: refund.status,
            },
          },
        });
      }

      // After processing all refunds, update original transaction and booking statuses
      const isFullRefund = charge.amount_refunded === charge.amount;
      const newStatus = isFullRefund
        ? TransactionStatus.FULLY_REFUNDED
        : TransactionStatus.PARTIALLY_REFUNDED;

      await tx.transaction.update({
        where: { id: originalTransaction.id },
        data: {
          status: newStatus,
          updatedAt: new Date(),
          metadata: {
            ...((originalTransaction.metadata as object) || {}),
            totalRefunded: (charge.amount_refunded || 0) / 100,
          },
        },
      });

      this.activityService.log({
        userId: originalTransaction.payerId as string,
        type: 'BOOKING',
        action: 'BOOKING_REFUNDED',
        metadata: JSON.stringify({
          transactionId: originalTransaction.id,
          bookingId: originalTransaction.booking?.id,
          experienceId: originalTransaction.booking?.experienceId,
          eventId: originalTransaction.booking?.eventId,
        }),
        ipAddress: 'Webhook',
      });

      this.logger.log(
        `Processed refunds for charge ${charge.id}; total refunded ${(charge.amount_refunded || 0) / 100}`,
      );
    });
  }
  private async handleChargeRefundUpdated(
    refund: Stripe.Refund,
  ): Promise<void> {
    this.logger.log(`Processing charge.refund.updated: ${refund.id}`);
    // Note:
    // Stripe sends a Refund object for charge.refund.updated events.
    // If you need to sync partial/full refund updates or statuses here,
    // you can look up the original booking transaction using refund.charge
    // (string or Charge) and then update the associated refund transaction.
    // For now we only log the event for observability.
  }

  async findWebhookEvents() {
    return this.prisma.webhookEvent.findMany();
  }
  // Removed in-memory processed events tracking; replaced by DB idempotency
}
