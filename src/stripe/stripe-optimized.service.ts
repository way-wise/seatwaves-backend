import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { CacheService } from '../common/services/cache.service';
import { DistributedLockService } from '../common/services/distributed-lock.service';
import Stripe from 'stripe';
import {
  TransactionType,
  TransactionStatus,
  PaymentProvider,
  Currency,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface CreatePaymentIntentDto {
  experienceId: string;
  eventId?: string;
  amount: number;
  currency?: Currency;
  customerId: string;
  couponId?: string;
  platformFeePercentage?: number;
  userId?: string;
}

@Injectable()
export class StripeOptimizedService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeOptimizedService.name);
  private readonly platformFeePercentage: number;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private cacheService: CacheService,
    private lockService: DistributedLockService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
      timeout: 30000, // 30 second timeout
      maxNetworkRetries: 3,
    });

    this.platformFeePercentage = this.configService.get<number>(
      'PLATFORM_FEE_PERCENTAGE',
      5,
    );
  }

  /**
   * Create optimized payment intent with proper error handling and transaction safety
   */
  async createPaymentIntent(data: CreatePaymentIntentDto): Promise<any> {
    const lockKey = `payment:${data.experienceId}:${data.eventId}:${data.userId}`;
    
    return this.lockService.withLock(lockKey, async () => {
      return this.prisma.$transaction(
        async (tx) => {
          // Validate experience and event
          const event = await tx.events.findUnique({
            where: { id: data.eventId },
            include: {
              experience: {
                include: {
                  user: {
                    select: {
                      id: true,
                      stripeAccountId: true,
                      stripeOnboardingComplete: true,
                    },
                  },
                },
              },
            },
          });

          if (!event) {
            throw new NotFoundException('Event not found');
          }

          const host = event.experience.user;
          if (!host.stripeAccountId || !host.stripeOnboardingComplete) {
            throw new BadRequestException('Host has not completed Stripe onboarding');
          }

          // Calculate amounts with validation
          const amount = Math.round(data.amount * 100); // Convert to cents
          const platformFee = Math.round(amount * (this.platformFeePercentage / 100));
          const hostAmount = amount - platformFee;

          if (amount <= 0 || platformFee < 0 || hostAmount <= 0) {
            throw new BadRequestException('Invalid payment amounts');
          }

          // Create payment intent with retry logic
          const paymentIntent = await this.retryStripeOperation(async () => {
            return this.stripe.paymentIntents.create({
              amount,
              currency: (data.currency || Currency.USD).toLowerCase(),
              customer: data.customerId,
              application_fee_amount: platformFee,
              transfer_data: {
                destination: host.stripeAccountId!,
              },
              metadata: {
                experienceId: data.experienceId,
                eventId: data.eventId || '',
                userId: data.userId || '',
                couponId: data.couponId || '',
                hostId: host.id,
                platformFee: platformFee.toString(),
                hostAmount: hostAmount.toString(),
              },
              automatic_payment_methods: {
                enabled: true,
              },
            });
          });

          // Create transaction record
          await this.transactionService.createTransaction({
            type: TransactionType.BOOKING_PAYMENT,
            amount: data.amount,
            currency: data.currency || Currency.USD,
            provider: PaymentProvider.STRIPE_CONNECT,
            payerId: data.userId,
            payeeId: host.id,
            experienceId: data.experienceId,
            stripePaymentIntent: paymentIntent.id,
            stripeAccountId: host.stripeAccountId,
            platformFee: Number(platformFee / 100),
            hostAmount: Number(hostAmount / 100),
            description: `Payment for ${event.experience.name}`,
          });

          this.logger.log(
            `Payment intent created: ${paymentIntent.id} - Amount: ${data.amount} - Host: ${host.id}`,
          );

          return {
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: data.amount,
            platformFee: platformFee / 100,
            hostAmount: hostAmount / 100,
          };
        },
        {
          timeout: 30000,
          isolationLevel: 'Serializable',
        },
      );
    });
  }

  /**
   * Process withdrawal approval with enhanced security and atomicity
   */
  async processWithdrawalApproval(
    withdrawalRequestId: string,
    approved: boolean,
    adminNotes?: string,
  ) {
    const lockKey = `withdrawal:${withdrawalRequestId}`;
    
    return this.lockService.withLock(lockKey, async () => {
      return this.prisma.$transaction(
        async (tx) => {
          const withdrawalRequest = await tx.withdrawalRequest.findUnique({
            where: { id: withdrawalRequestId },
            include: {
              host: {
                select: {
                  id: true,
                  name: true,
                  stripeAccountId: true,
                  stripeOnboardingComplete: true,
                },
              },
            },
          });

          if (!withdrawalRequest) {
            throw new NotFoundException('Withdrawal request not found');
          }

          if (withdrawalRequest.status !== 'PENDING') {
            throw new BadRequestException('Withdrawal request already processed');
          }

          const host = withdrawalRequest.host;
          if (!host.stripeAccountId || !host.stripeOnboardingComplete) {
            throw new BadRequestException('Host onboarding incomplete');
          }

          let transfer: Stripe.Transfer | null = null;

          if (approved) {
            // Validate withdrawal amount
            const amount = Math.round(Number(withdrawalRequest.amount) * 100);
            if (amount <= 0) {
              throw new BadRequestException('Invalid withdrawal amount');
            }

            // Check host balance before transfer
            const balance = await this.getHostBalance(host.stripeAccountId);
            if (balance.available < amount / 100) {
              throw new BadRequestException('Insufficient balance for withdrawal');
            }

            // Process transfer with retry logic
            transfer = await this.retryStripeOperation(async () => {
              return this.stripe.transfers.create({
                amount,
                currency: withdrawalRequest.currency.toLowerCase(),
                destination: host.stripeAccountId!,
                description: `Withdrawal: ${withdrawalRequest.description}`,
                metadata: {
                  withdrawalRequestId: withdrawalRequest.id,
                  hostId: host.id,
                  adminApproval: 'true',
                },
              });
            });

            // Create transaction record
            await this.transactionService.createTransaction({
              type: TransactionType.HOST_PAYOUT,
              amount: Number(withdrawalRequest.amount),
              currency: withdrawalRequest.currency as Currency,
              provider: PaymentProvider.STRIPE_CONNECT,
              payeeId: host.id,
              stripeTransferId: transfer.id,
              stripeAccountId: host.stripeAccountId!,
              description: `Approved withdrawal: ${withdrawalRequest.description}`,
              notes: adminNotes,
              hostAmount: Number(withdrawalRequest.amount),
            });
          }

          // Update withdrawal request
          const updatedRequest = await tx.withdrawalRequest.update({
            where: { id: withdrawalRequestId },
            data: {
              status: approved ? 'APPROVED' : 'REJECTED',
              processedAt: new Date(),
              adminNotes: adminNotes || null,
              stripeTransferId: transfer?.id || null,
            },
          });

          // Invalidate cache
          await this.cacheService.invalidatePattern(`host:${host.id}:*`);

          this.logger.log(
            `${approved ? 'Approved' : 'Rejected'} withdrawal ${withdrawalRequestId} - Amount: ${withdrawalRequest.amount}`,
          );

          return {
            success: true,
            withdrawalRequest: updatedRequest,
            transfer: transfer ? { id: transfer.id, amount: transfer.amount } : null,
          };
        },
        {
          timeout: 45000,
          isolationLevel: 'Serializable',
        },
      );
    });
  }

  /**
   * Get host balance with caching
   */
  async getHostBalance(stripeAccountId: string): Promise<any> {
    const cacheKey = `stripe:balance:${stripeAccountId}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.retryStripeOperation(async () => {
          return this.stripe.balance.retrieve({
            stripeAccount: stripeAccountId,
          });
        });
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Webhook handler with proper validation and idempotency
   */
  async handleWebhook(payload: string, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency check
    const eventKey = `webhook:${event.id}`;
    const processed = await this.cacheService.get(eventKey);
    if (processed) {
      this.logger.warn(`Webhook event already processed: ${event.id}`);
      return;
    }

    try {
      await this.processWebhookEvent(event);
      await this.cacheService.set(eventKey, true, 86400); // 24 hours
    } catch (error) {
      this.logger.error(`Webhook processing failed for event ${event.id}`, error);
      throw error;
    }
  }

  /**
   * Process different webhook events
   */
  private async processWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      case 'account.updated':
        await this.handleAccountUpdate(event.data.object as Stripe.Account);
        break;
      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update transaction status
      await tx.transaction.updateMany({
        where: { stripePaymentIntent: paymentIntent.id },
        data: {
          status: TransactionStatus.SUCCESS,
          processedAt: new Date(),
          settledAt: new Date(),
        },
      });

      // Update booking status if applicable
      const metadata = paymentIntent.metadata;
      if (metadata.eventId && metadata.userId) {
        await tx.booking.updateMany({
          where: {
            eventId: metadata.eventId,
            userId: metadata.userId,
            status: 'PENDING',
          },
          data: {
            status: 'CONFIRMED',
            updatedAt: new Date(),
          },
        });
      }
    });

    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.prisma.transaction.updateMany({
      where: { stripePaymentIntent: paymentIntent.id },
      data: {
        status: TransactionStatus.FAILED,
        processedAt: new Date(),
      },
    });

    this.logger.log(`Payment failed: ${paymentIntent.id}`);
  }

  /**
   * Handle account updates
   */
  private async handleAccountUpdate(account: Stripe.Account): Promise<void> {
    const userId = account.metadata?.userId;
    if (!userId) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeAccountStatus: account.details_submitted ? 'active' : 'pending',
        stripeOnboardingComplete: account.details_submitted && account.charges_enabled,
      },
    });

    // Invalidate cache
    await this.cacheService.invalidatePattern(`user:${userId}:*`);
  }

  /**
   * Retry Stripe operations with exponential backoff
   */
  private async retryStripeOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.maxRetries,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries - 1) break;
        
        // Only retry on network errors or rate limits
        if (error instanceof Stripe.errors.StripeError) {
          if (error.type === 'StripeConnectionError' || error.code === 'rate_limit') {
            const delay = this.retryDelay * Math.pow(2, attempt);
            await this.sleep(delay);
            continue;
          }
        }
        
        throw error;
      }
    }

    throw lastError || new Error('Operation failed after retries') || new Error('Operation failed after retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
