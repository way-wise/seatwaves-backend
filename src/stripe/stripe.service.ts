import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BookingStatus,
  Currency,
  DeliveryType,
  PaymentProvider,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationService } from 'src/notification/notification.service';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { CreatePaymentsIntentDto } from './stripe.controller';
import { ActivityService } from 'src/activity/activity.service';
import { Request } from 'express';

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

export interface createPaymentSession {
  ticketId: string;
  deliveryType: DeliveryType;
  couponId?: string;
  pickupAddress?: string;
  phone?: string;
  email?: string;
}

export interface OnboardHostDto {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountHolderName: string;
  };
}

export interface OnboardUserDto {
  userId: string;
  email: string;
  name: string;
}

export interface ProcessPayoutDto {
  hostId: string;
  amount: number;
  currency?: Currency;
  bookingId?: string;
  description?: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);
  private readonly platformFeePercentage: number;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private readonly notificationService: NotificationService,
    private readonly activityService: ActivityService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    this.stripe = new Stripe(secretKey);
    this.platformFeePercentage = this.configService.get<number>(
      'PLATFORM_FEE_PERCENTAGE',
      5, // Default 5%
    );
  }

  /**
   * Developer helper: Add instant test balance to the platform account (TEST MODE ONLY)
   */
  async addInstantTestBalance(params: {
    amount: number; // in dollars
    currency?: string; // default usd
    description?: string;
  }) {
    const env = this.configService.get<string>('NODE_ENV') || 'development';
    if (env === 'production') {
      throw new ForbiddenException('This endpoint is disabled in production');
    }

    const amountCents = Math.round((params.amount || 0) * 100);
    if (amountCents <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    try {
      // Stripe Test Helpers: balance transactions
      // Adds funds to the platform's test-mode balance instantly
      const bt = await (
        this.stripe as any
      ).test_helpers.balance_transactions.create({
        amount: amountCents,
        currency: (params.currency || 'usd').toLowerCase(),
        description: params.description || 'Developer top-up',
      });

      this.logger.log(
        `Added test balance: ${(amountCents / 100).toFixed(2)} ${(params.currency || 'usd').toUpperCase()}`,
      );

      return bt;
    } catch (error) {
      this.logger.error(
        'Failed to add test balance via Stripe test helpers',
        error,
      );
      throw new InternalServerErrorException('Failed to add test balance');
    }
  }
  // ============= MARKETPLACE ONBOARDING =============
  // Note: Only admin has the main Stripe account
  // Hosts and users are onboarded as connected accounts to the admin's marketplace

  /**
   * Create Stripe Connect Express account and onboarding link for host
   */
  async createHostOnboardingLink(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      let accountId = user.stripeAccountId;

      // Create Stripe Connect Express account if doesn't exist
      if (!accountId) {
        const account = await this.stripe.accounts.create({
          type: 'express',
          country: 'US', // Adjust based on your needs
          email: user.email || undefined,
          metadata: {
            userId: user.id,
            name: user.name || 'Unknown',
          },
        });

        accountId = account.id;

        // Update user with Stripe account ID
        await tx.user.update({
          where: { id: userId },
          data: {
            stripeAccountId: accountId,
            stripeAccountStatus: 'pending',
          },
        });
      }

      // Create onboarding link
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${this.configService.get('APP_CLIENT_URL')}/onboarding/refresh?accountId=${accountId}`,
        return_url: `${this.configService.get('APP_CLIENT_URL')}/onboarding/complete?accountId=${accountId}`,
        type: 'account_onboarding',
      });

      this.logger.log(`Created onboarding link for host ${userId}`);

      console.log('accountLink', accountLink);

      return {
        accountId,
        onboardingUrl: accountLink.url,
        message: 'Onboarding link created successfully',
      };
    });
  }

  /**
   *
   * OnBoard Redirect Complete
   */

  async onBoardComplete(accountId: string) {
    const user = await this.prisma.user.findFirst({
      where: { stripeAccountId: accountId },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Update user with Stripe account ID
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountId: user.stripeAccountId,
        stripeAccountStatus: 'onboarded',
        stripeOnboardingComplete: true,
      },
    });

    this.logger.log(`Onboarded host ${user.id}`);

    return {
      success: true,
      userId: user.id,
      marketplaceStatus: 'onboarded',
      message: 'Host successfully onboarded to marketplace',
    };
  }

  /**
   * Check host onboarding status
   */
  async checkHostOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeAccountStatus: true,
      },
    });

    if (!user?.stripeAccountId) {
      return {
        onboarded: false,
        status: 'not_started',
        message: 'Host has not started onboarding',
      };
    }

    // Check with Stripe
    const account = await this.stripe.accounts.retrieve(user.stripeAccountId);

    const isOnboarded =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    // Update local status if changed
    if (isOnboarded !== user.stripeOnboardingComplete) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          stripeOnboardingComplete: isOnboarded,
          stripeAccountStatus: isOnboarded ? 'active' : 'pending',
        },
      });
    }

    return {
      onboarded: isOnboarded,
      status:
        (account.requirements?.currently_due?.length || 0) > 0
          ? 'pending'
          : 'active',
      accountId: user.stripeAccountId,
      requirements: account.requirements?.currently_due || [],
    };
  }

  /**
   * Onboard user to admin's marketplace account
   * Users don't need separate accounts - they're just customers in admin's account
   */
  async onboardUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Users are just customers in the admin's Stripe account
      // No separate onboarding needed - they're automatically part of the marketplace
      await this.getOrCreateCustomer(userId);

      this.logger.log(
        `Onboarded user ${userId} as customer to admin marketplace`,
      );

      return {
        success: true,
        userId,
        marketplaceStatus: 'onboarded',
        message: 'User successfully onboarded to marketplace as customer',
      };
    } catch (error) {
      this.logger.error('Failed to onboard user:', error);
      throw new InternalServerErrorException(
        'Failed to onboard user to marketplace',
      );
    }
  }

  /**
   * Get marketplace onboarding status for host or user
   */
  async getMarketplaceStatus(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Get user roles to determine if they're a host
      const userRoles = await this.prisma.userRoles.findMany({
        where: { userId: user.id },
        include: { role: true },
      });

      const isHost = userRoles.some((ur) => ur.role.name === 'HOST');
      const isCustomer = user.stripeCustomerId ? true : false;
      const isOnboarded = user.stripeOnboardingComplete || false;

      return {
        userId: user.id,
        isOnboarded,
        userType: isHost ? 'host' : 'customer',
        onboardingComplete: user.stripeOnboardingComplete || false,
        marketplaceStatus: user.stripeAccountStatus || 'not_onboarded',
        stripeCustomerId: user.stripeCustomerId,
        canReceivePayouts: isHost && user.stripeOnboardingComplete,
        canMakePayments: isCustomer,
        roles: userRoles.map((ur) => ur.role.name),
      };
    } catch (error) {
      this.logger.error('Failed to get marketplace status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to retrieve marketplace status',
      );
    }
  }

  // ============= PAYMENT PROCESSING =============

  /**
   * Create Stripe Checkout session for booking (Hosted payment page)
   * Enhanced with saved payment method support
   */
  async createCheckoutSession(
    data: createPaymentSession,
    userId: string,
    req: Request,
  ) {
    try {
      // 1) Do DB reads and validations quickly inside a short transaction
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      if (!user) throw new NotFoundException('This user does not exist');

      const ticket = await this.prisma.ticket.findUnique({
        where: { id: data.ticketId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  stripeAccountId: true,
                  stripeOnboardingComplete: true,
                },
              },
            },
          },
        },
      });

      if (!ticket) throw new NotFoundException('This seat does not exist');

      const price = new Decimal(ticket.price);
      const discount = new Decimal(ticket.discount || 0);

      const basePrice = price.toNumber();
      const discountPercent = discount.toNumber();
      if (basePrice <= 0) {
        throw new BadRequestException('Invalid event pricing');
      }

      const subtotal = basePrice;
      const discountAmount = subtotal * (discountPercent / 100);
      const vat = 0;
      const tax = 0;
      const total = subtotal - discountAmount + vat + tax;

      const seller = ticket.event.seller;
      if (!seller.stripeAccountId) {
        throw new BadRequestException(
          'Seller has not completed Stripe onboarding',
        );
      }

      let appliedDiscount = 0;
      let finalAmount = total;

      const platformFee = this.calculatePlatformFee(finalAmount, 5);
      const ctx = {
        user,
        ticket,
        seller,
        finalAmount,
        appliedDiscount,
        platformFee,
      };

      // 2) Outside transaction: ensure customer exists
      const customer = await this.getOrCreateCustomer(userId);

      // 3) Create Stripe Checkout Session outside the transaction expire 5 min
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: ctx.ticket.event.title,
                description: 'Seat booking',
              },
              unit_amount: Math.round(ctx.finalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${this.configService.get('APP_CLIENT_URL')}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.configService.get('APP_CLIENT_URL')}/booking/cancel`,
        // expires_at: Math.floor(Date.now() / 1000) + 10 * 60,
        customer: customer.id,
        payment_intent_data: {
          // application_fee_amount: Math.round(ctx.platformFee * 100),
          // transfer_data: { destination: ctx.seller.stripeAccountId as string },
          metadata: {
            ticketId: ctx.ticket.id || '',
            sellerId: ctx.seller.id,
            customerId: customer.id,
            couponId: data.couponId || '',
            appliedDiscount: ctx.appliedDiscount.toString(),
            paymentType: 'booking_payment',
            deliveryType: data.deliveryType,
          },
        },
      });

      // 3.1) Reserve tickets and create booking + transaction atomically
      await this.prisma.$transaction(async (tx) => {
        // Re-read event inside the transaction to re-validate availability

        await tx.booking.create({
          data: {
            userId: userId,
            status: BookingStatus.PENDING,
            ticketId: data.ticketId,
            price: price,
            discount: appliedDiscount + discountAmount,
            paymentMethod: 'STRIPE',
            deliveryType: data.deliveryType,
            pickupAddress: data.pickupAddress,
            phone: data.phone,
            email: data.email,
            tax,
            vat,
            total,
            transactions: {
              create: {
                type: TransactionType.BOOKING_PAYMENT,
                amount: ctx.finalAmount,
                currency: Currency.USD,
                provider: PaymentProvider.STRIPE_CONNECT,
                payerId: userId,
                payeeId: ctx.seller.id,
                eventId: ctx.ticket.event.id,
                stripePaymentIntent: session.id,
                stripeAccountId: ctx.seller.stripeAccountId as string,
                platformFee: ctx.platformFee,
                sellerAmount: ctx.finalAmount - ctx.platformFee,
                description: `Payment for ${ctx.ticket.event.title}`,
                externalTxnId: session.id,
                metadata: {
                  reservedAt: new Date().toISOString(),
                  reservedCount: 1,
                },
              },
            },
          },
        });
        await tx.ticket.update({
          where: { id: data.ticketId },
          data: { isBooked: true },
        });
      });

      // 4) Create transaction record outside the transaction
      // const transaction = await this.transactionService.createTransaction({
      //   type: TransactionType.BOOKING_PAYMENT,
      //   amount: ctx.finalAmount,
      //   currency: Currency.USD,
      //   provider: PaymentProvider.STRIPE_CONNECT,
      //   payerId: userId,
      //   payeeId: ctx.host.id,
      //   experienceId: ctx.event.experienceId,
      //   couponId: data.couponId,
      //   stripePaymentIntent: session.id,
      //   stripeAccountId: ctx.host.stripeAccountId as string,
      //   platformFee: ctx.platformFee,
      //   hostAmount: ctx.finalAmount - ctx.platformFee,
      //   description: `Payment for ${ctx.event.experience.name}`,
      //   externalTxnId: session.id,
      // });

      this.activityService.log({
        userId,
        type: 'BOOKING',
        action: 'BOOKING_CHECKOUT_STARTED',
        metadata: JSON.stringify(ctx),
        ipAddress: req.ip ? req.ip : 'Unknown',
      });

      this.logger.log(
        `Created Checkout Session ${session.id} for event ${ctx.ticket.event.id} and user ${userId}`,
      );

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        platformFee: ctx.platformFee,
        hostAmount: ctx.finalAmount - ctx.platformFee,
        appliedDiscount: ctx.appliedDiscount,
        finalAmount: ctx.finalAmount,
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create checkout session',
      );
    }
  }

  /**
   * Create Stripe Payment Link for booking (Simple URL-based payments)
   * Enhanced with customer association for better tracking
   */

  /**
   * Create payment intent for booking (Manual integration - keep for flexibility)
   * Enhanced with saved payment method support
   */
  async createPaymentIntent(
    data: CreatePaymentsIntentDto & {
      paymentMethodId?: string;
      savePaymentMethod?: boolean;
    },
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Fetch experience and host details
      // Get user with lock to prevent concurrent operations
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
      if (!user) throw new NotFoundException('This user does not exist');

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await this.getOrCreateCustomer(userId, tx);
        customerId = customer.id;
      }

      // Validate that we have a proper customer ID (should start with 'cus_')
      if (!customerId || !customerId.startsWith('cus_')) {
        throw new BadRequestException(
          `Invalid customer ID: ${customerId}. Expected Stripe customer ID starting with 'cus_'`,
        );
      }

      // Get event with pessimistic locking to prevent race conditions
      const event = await tx.event.findUnique({
        where: { id: data.eventId },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              stripeAccountId: true,
              stripeOnboardingComplete: true,
            },
          },
        },
      });

      if (!event) throw new NotFoundException('This event does not exist');

      // Calculate pricing with proper validation
      const basePrice = new Decimal(0).toNumber();
      const discount = new Decimal(0).toNumber();
      const discountType = 'PERCENTAGE';

      if (basePrice <= 0) {
        throw new BadRequestException('Invalid event pricing');
      }

      const subtotal = basePrice * data.guestCount;
      const discountAmount =
        discountType === 'PERCENTAGE' ? subtotal * (discount / 100) : discount;
      const vat = 0; // Configure based on business rules
      const tax = 0; // Configure based on business rules
      const total = subtotal - discountAmount + vat + tax;

      const seller = event.seller;
      if (!seller.stripeAccountId || !seller.stripeOnboardingComplete) {
        throw new BadRequestException(
          'Seller has not been onboarded to the marketplace',
        );
      }

      // Calculate platform fee and host amount
      const platformFeePercentage = this.platformFeePercentage;
      const platformFee = Math.round(total * (platformFeePercentage / 100));
      const sellerAmount = total - platformFee;

      // Apply coupon discount if provided
      let finalAmount = total;
      let appliedDiscount = 0;

      // Prepare payment intent configuration
      const paymentIntentConfig: any = {
        amount: Math.round(finalAmount * 100), // Convert to cents
        currency: Currency.USD.toLowerCase(),
        customer: customerId,
        capture_method: 'automatic', // Manual capture when confirmed
        application_fee_amount: Math.round(platformFee * 100), // Platform fee in cents
        transfer_data: {
          destination: seller.stripeAccountId as string, // Seller's Stripe Connect account ID
        },
        automatic_payment_methods: {
          enabled: true,
        },
        setup_future_usage: 'off_session',
        metadata: {
          eventId: data.eventId || '',
          sellerId: seller.id,
          platformFee: platformFee.toString(),
          sellerAmount: sellerAmount.toString(),
          couponId: data.couponId || '',
          appliedDiscount: appliedDiscount.toString(),
          paymentType: 'booking_payment',
          savePaymentMethod: data.savePaymentMethod?.toString() || 'false',
        },
      };

      // Use specific payment method if provided
      if (data.paymentMethodId) {
        paymentIntentConfig.payment_method = data.paymentMethodId;
        paymentIntentConfig.confirmation_method = 'automatic';
        paymentIntentConfig.confirm = true;
      } else {
        // Enable automatic payment methods for new payments
        paymentIntentConfig.automatic_payment_methods = {
          enabled: true,
        };
      }

      // Setup future usage if saving payment method
      if (data.savePaymentMethod) {
        paymentIntentConfig.setup_future_usage = 'off_session';
      }

      // Create Stripe PaymentIntent with marketplace transfer
      const paymentIntent =
        await this.stripe.paymentIntents.create(paymentIntentConfig);

      //ephemeralKey
      // Create ephemeral key for the customer on the connected account
      const ephemeralKey = await this.stripe.ephemeralKeys.create(
        { customer: customerId },
        {
          stripeAccount: seller.stripeAccountId as string,
          apiVersion: '2024-04-10',
        },
      );
      // Create booking atomically
      const booking = await tx.booking.create({
        data: {
          userId: userId,
          ticketId: data.eventId,
          price: new Decimal(basePrice),
          discount: new Decimal(discountAmount + appliedDiscount),
          vat: new Decimal(vat),
          tax: new Decimal(tax),
          total: new Decimal(total),
          paymentMethod: 'STRIPE',
          status: 'PENDING',
          transactions: {
            create: {
              type: TransactionType.BOOKING_PAYMENT,
              amount: finalAmount,
              currency: Currency.USD,
              provider: PaymentProvider.STRIPE_CONNECT,
              payerId: userId,
              payeeId: seller.id,
              stripePaymentIntent: paymentIntent.id,
              stripeAccountId: seller.stripeAccountId,
              externalTxnId: paymentIntent.id,
              platformFee,
              sellerAmount,
              description: `Payment for ${event.title} by ${user.name}`,
            },
          },
        },
      });

      this.logger.log(
        `Created PaymentIntent ${paymentIntent.id} for experience ${event.id} and user ${userId}`,
      );

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        ephemeralKey,
        customerId,
        booking,
        platformFee,
        sellerAmount,
        appliedDiscount,
        finalAmount,
      };
    });
  }

  /**
   * Confirm payment intent with payment method
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ) {
    try {
      // First, retrieve the PaymentIntent to check its status
      const existingPaymentIntent =
        await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (existingPaymentIntent.status === 'succeeded') {
        // Already confirmed, return as is
        return existingPaymentIntent;
      }

      // Confirm with payment method if provided
      const confirmParams: any = {};
      if (paymentMethodId) {
        confirmParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams,
      );

      // Update transaction status based on result
      const status =
        paymentIntent.status === 'succeeded'
          ? TransactionStatus.SUCCESS
          : TransactionStatus.PROCESSING;

      await this.transactionService.updateTransactionStatus(
        paymentIntentId,
        status,
        { stripeStatus: paymentIntent.status },
      );

      //send notification to host

      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to confirm payment intent:', error);

      // Update transaction to failed
      await this.transactionService.updateTransactionStatus(
        paymentIntentId,
        TransactionStatus.FAILED,
        { error: error.message },
      );

      throw new BadRequestException(
        `Payment confirmation failed: ${error.message}`,
      );
    }
  }

  /**
   * Get payment details from payment intent
   */
  async getPaymentUrl(paymentIntentId: string) {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    // First create a product
    const product = await this.stripe.products.create({
      name: 'Booking Payment',
    });

    // Then create a price for that product
    const price = await this.stripe.prices.create({
      currency: paymentIntent.currency,
      product: product.id,
      unit_amount: paymentIntent.amount,
    });

    // Create a payment link using the price ID
    const paymentLink = await this.stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
    });

    return paymentLink.url;
  }

  // ============= PAYOUT MANAGEMENT =============

  /**
   * Process manual payout to host
   */
  async processHostPayout(data: ProcessPayoutDto) {
    return this.prisma.$transaction(async (tx) => {
      try {
        const host = await tx.user.findUnique({
          where: { id: data.hostId },
        });

        if (!host?.stripeAccountId || !host.stripeOnboardingComplete) {
          throw new BadRequestException(
            'Host has not completed Stripe onboarding',
          );
        }

        // Create transfer to host
        const transfer = await this.stripe.transfers.create({
          amount: Math.round(data.amount * 100), // Convert to cents
          currency: (data.currency || Currency.USD).toLowerCase(),
          destination: host.stripeAccountId,
          description: data.description || `Payout to ${host.name}`,
          metadata: {
            hostId: data.hostId,
            bookingId: data.bookingId || '',
          },
        });

        // Create transaction record
        const transaction = await this.transactionService.createTransaction({
          type: TransactionType.SELLER_PAYOUT,
          amount: data.amount,
          currency: data.currency || Currency.USD,
          provider: PaymentProvider.STRIPE_CONNECT,
          payeeId: data.hostId,
          bookingId: data.bookingId,
          stripeTransferId: transfer.id,
          stripeAccountId: host.stripeAccountId,
          description: data.description || `Payout to ${host.name}`,
        });

        this.logger.log(
          `Processed payout ${transfer.id} to host ${data.hostId}`,
        );
        return { transfer, transaction };
      } catch (error) {
        this.logger.error('Failed to process payout:', error);
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new InternalServerErrorException('Failed to process payout');
      }
    });
  }

  // ============= REFUND MANAGEMENT =============

  /**
   * Resolve a real PaymentIntent ID from various identifiers we may have stored.
   * Supports:
   * - payment_intent id (pi_...)
   * - checkout session id (cs_...)
   * - payment link id (plink_...)
   */
  private async resolvePaymentIntentId(identifier: string): Promise<string> {
    if (!identifier) {
      throw new BadRequestException('Missing payment identifier');
    }
    // Already a PaymentIntent ID
    if (identifier.startsWith('pi_')) return identifier;

    // Checkout session id
    if (identifier.startsWith('cs_')) {
      const session = await this.stripe.checkout.sessions.retrieve(identifier);
      if (!session.payment_intent) {
        throw new BadRequestException(
          `Checkout Session ${identifier} has no payment_intent yet`,
        );
      }
      return session.payment_intent as string;
    }

    // Payment Link id: list sessions created from this link and pick latest completed
    if (identifier.startsWith('plink_')) {
      const sessions = await this.stripe.checkout.sessions.list({
        payment_link: identifier,
        limit: 1,
      });
      const session = sessions.data[0];
      if (!session || !session.payment_intent) {
        throw new BadRequestException(
          `No completed Checkout Session found for Payment Link ${identifier}`,
        );
      }
      return session.payment_intent as string;
    }

    // Last resort: try retrieving as a checkout session id
    try {
      const session = await this.stripe.checkout.sessions.retrieve(identifier);
      if (session.payment_intent) return session.payment_intent as string;
    } catch (_) {}

    throw new BadRequestException(
      `Unsupported payment identifier format: ${identifier}`,
    );
  }

  /**
   * Process refund for a payment
   */
  async processRefund(
    paymentIntentId: string,
    refundAmount?: number,
    reason?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      try {
        // Try to resolve real PaymentIntent id first
        const resolvedPaymentIntentId =
          await this.resolvePaymentIntentId(paymentIntentId);

        // Get original transaction (by either the resolved or stored identifier)
        const originalTransaction = await tx.transaction.findFirst({
          where: {
            OR: [
              { stripePaymentIntent: resolvedPaymentIntentId },
              { stripePaymentIntent: paymentIntentId },
            ],
          },
        });

        if (!originalTransaction) {
          throw new NotFoundException('Original transaction not found');
        }

        // Get PaymentIntent details
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          resolvedPaymentIntentId,
        );

        // Determine remaining refundable amount in cents
        let latestChargeId = paymentIntent.latest_charge as string | undefined;
        let maxRefundableCents: number | null = null;
        if (latestChargeId) {
          const charge = await this.stripe.charges.retrieve(latestChargeId);
          const chargedCents = charge.amount || 0;
          const refundedCents = charge.amount_refunded || 0;
          maxRefundableCents = Math.max(chargedCents - refundedCents, 0);
        } else {
          // Fallback: use PI amount - (amount_received - amount_capturable) heuristics; safest is to bound by amount
          const chargedCents = paymentIntent.amount || 0;
          const refundedCents = 0; // unknown here; being conservative
          maxRefundableCents = Math.max(chargedCents - refundedCents, 0);
        }

        let requestedCents = refundAmount
          ? Math.round(refundAmount * 100)
          : maxRefundableCents;
        if (requestedCents === null || requestedCents === undefined) {
          requestedCents = 0;
        }
        // Cap to remaining refundable
        const refundAmountCents = Math.min(
          requestedCents,
          maxRefundableCents || 0,
        );
        if (refundAmountCents <= 0) {
          throw new BadRequestException(
            'No refundable amount remains for this charge',
          );
        }

        // Create refund
        const allowedReasons = [
          'duplicate',
          'fraudulent',
          'requested_by_customer',
        ] as const;
        const normalizedReason = allowedReasons.includes((reason || '') as any)
          ? (reason as any)
          : 'requested_by_customer';
        const refund = await this.stripe.refunds.create({
          payment_intent: resolvedPaymentIntentId,
          amount: refundAmountCents,
          reason: normalizedReason as any,
          metadata: {
            originalTransactionId: originalTransaction.id,
          },
        });

        // Idempotency: avoid creating duplicate refund transaction for the same Stripe refund id
        const existingRefund = await tx.transaction.findFirst({
          where: { externalTxnId: refund.id },
          select: { id: true },
        });

        let refundTransaction: any = null;
        if (!existingRefund) {
          // Create refund transaction directly to avoid payer/payee onboarding validation in TransactionService
          refundTransaction = await tx.transaction.create({
            data: {
              type: TransactionType.BOOKING_REFUND,
              amount: Math.max(refundAmountCents / 100, 0),
              currency: originalTransaction.currency,
              provider: PaymentProvider.STRIPE_CONNECT,
              payerId: originalTransaction.payeeId || null, // Platform/host side paying back
              payeeId: originalTransaction.payerId || null, // Customer receives
              parentTransactionId: originalTransaction.id,
              // Link to the original charge when available
              stripeChargeId: (paymentIntent.latest_charge as string) || null,
              // Store Stripe refund id for idempotency/traceability
              externalTxnId: refund.id,
              description: `Refund for ${originalTransaction.description || 'booking'}`,
              notes: reason,
              status: TransactionStatus.SUCCESS,
              processedAt: new Date(),
              settledAt: new Date(),
            },
          });
        }

        this.logger.log(
          `Processed refund ${refund.id} for payment ${resolvedPaymentIntentId}`,
        );
        return {
          refund,
          refundTransaction: refundTransaction || existingRefund,
        };
      } catch (error) {
        this.logger.error('Failed to process refund:', error);
        if (error instanceof NotFoundException) {
          throw error;
        }
        throw new InternalServerErrorException('Failed to process refund');
      }
    });
  }

  // ============= WEBHOOK HANDLING =============

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(signature: string, payload: Buffer) {
    // Step 1: Verify signature using raw payload
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Invalid Stripe webhook signature: ${err?.message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received webhook: type=${event.type} id=${event.id}`);

    // Step 2: Process event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          this.logger.log(`Processing checkout session completed: ${event}`);
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;
        case 'payment_intent.succeeded':
          this.logger.log(`Processing payment intent succeeded: ${event}`);
          await this.handlePaymentIntentSucceeded(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'payment_intent.payment_failed':
          this.logger.log(`Processing payment intent payment failed: ${event}`);
          await this.handlePaymentIntentFailed(
            event.data.object as Stripe.PaymentIntent,
          );
          break;

        case 'account.updated':
          this.logger.log(`Processing account updated: ${event}`);
          await this.handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        case 'transfer.created':
          this.logger.log(`Processing transfer created: ${event}`);
          this.logger.log(`Processing transfer created: ${event}`);
          await this.handleTransferCreated(
            event.data.object as Stripe.Transfer,
          );
          break;

        case 'charge.dispute.created':
          this.logger.log(`Processing charge dispute created: ${event}`);
          await this.handleChargeDisputeCreated(
            event.data.object as Stripe.Dispute,
          );
          break;

        default:
          this.logger.log(`Unhandled webhook event: ${event.type}`);
      }

      return { received: true };
    } catch (err: any) {
      this.logger.error(
        `Webhook processing failed for event ${event.id} (${event.type}): ${err?.message}`,
        err?.stack,
      );
      // Re-throw to let Stripe retry on non-2xx if it's a transient/server error
      throw err instanceof BadRequestException
        ? err
        : new InternalServerErrorException('Webhook processing failed');
    }
  }

  private async handleCheckoutSessionCompleted(
    checkoutSession: Stripe.Checkout.Session,
  ) {
    await this.transactionService.updateTransactionStatus(
      checkoutSession.id,
      TransactionStatus.SUCCESS,
      {
        stripeStatus: checkoutSession.status,
        processedAt: new Date(),
      },
    );
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    await this.transactionService.updateTransactionStatus(
      paymentIntent.id,
      TransactionStatus.SUCCESS,
      {
        stripeStatus: paymentIntent.status,
        processedAt: new Date(),
      },
    );

    // Create commission transaction for platform
    const platformFee = paymentIntent.metadata?.platformFee;
    if (platformFee) {
      await this.transactionService.createTransaction({
        type: TransactionType.ADMIN_COMMISSION,
        amount: parseFloat(platformFee),
        currency: paymentIntent.currency.toUpperCase() as Currency,
        provider: PaymentProvider.STRIPE_CONNECT,
        payeeId: 'platform', // Special ID for platform
        stripePaymentIntent: paymentIntent.id,
        description: 'Platform commission',
      });
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.transactionService.updateTransactionStatus(
      paymentIntent.id,
      TransactionStatus.FAILED,
      {
        stripeStatus: paymentIntent.status,
        lastPaymentError: paymentIntent.last_payment_error,
      },
    );
  }

  private async handleTransferCreated(transfer: Stripe.Transfer) {
    // Update host payout transaction status
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeTransferId: transfer.id },
    });

    if (transaction) {
      await this.transactionService.updateTransactionStatus(
        transaction.id,
        TransactionStatus.SUCCESS,
        {
          stripeStatus: 'succeeded',
          processedAt: new Date(),
        },
      );
    }
  }

  private async handleAccountUpdated(account: Stripe.Account) {
    const onboardingComplete =
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled;

    await this.prisma.user.updateMany({
      where: { stripeAccountId: account.id },
      data: {
        stripeOnboardingComplete: onboardingComplete,
        stripeAccountStatus: onboardingComplete ? 'active' : 'pending',
      },
    });
  }

  private async handleChargeDisputeCreated(dispute: Stripe.Dispute) {
    // Mark related transaction as disputed
    const transaction = await this.prisma.transaction.findFirst({
      where: { stripeChargeId: dispute.charge as string },
    });

    if (transaction) {
      await this.transactionService.updateTransactionStatus(
        transaction.id,
        TransactionStatus.DISPUTED,
        {
          disputeId: dispute.id,
          disputeReason: dispute.reason,
          disputeStatus: dispute.status,
        },
      );
    }
  }

  // ============= HOST BALANCE & WITHDRAWAL MANAGEMENT =============

  //**
  // get host Balance in stripe
  //  */

  async getHostBalanceInStripe(hostId: string) {
    const host = await this.prisma.user.findUnique({
      where: { id: hostId },
      select: {
        id: true,
        name: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!host) {
      throw new NotFoundException('Host not found');
    }

    if (!host.stripeAccountId || !host.stripeOnboardingComplete) {
      throw new BadRequestException('Host has not completed Stripe onboarding');
    }

    const balance = await this.stripe.balance.retrieve({
      stripeAccount: host.stripeAccountId,
    });

    return balance;
  }

  /**
   * Get host's available balance for withdrawal
   */
  async getHostBalance(sellerId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Verify host exists and is onboarded
      const seller = await tx.user.findUnique({
        where: { id: sellerId },
        select: {
          id: true,
          name: true,
          stripeAccountId: true,
          stripeOnboardingComplete: true,
        },
      });

      if (!seller) {
        throw new NotFoundException('Seller not found');
      }

      if (!seller.stripeAccountId || !seller.stripeOnboardingComplete) {
        throw new BadRequestException(
          'Seller has not completed Stripe onboarding',
        );
      }

      // Get all successful booking payments where this user is the seller
      const successfulPayments = await tx.transaction.findMany({
        where: {
          payeeId: sellerId,
          type: TransactionType.BOOKING_PAYMENT,
          status: TransactionStatus.SUCCESS,
        },
        select: {
          id: true,
          amount: true,
          platformFee: true,
          sellerAmount: true,
          createdAt: true,
          description: true,
          eventId: true,
        },
      });

      // Get all payouts already made to this host
      const completedPayouts = await tx.transaction.findMany({
        where: {
          payeeId: sellerId,
          type: TransactionType.SELLER_PAYOUT,
          status: TransactionStatus.SUCCESS,
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          description: true,
        },
      });

      // Get pending withdrawal requests
      const pendingWithdrawals = await tx.withdrawalRequest.findMany({
        where: {
          sellerId,
          status: 'PENDING',
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          description: true,
        },
      });

      // Calculate totals
      const totalEarnings = successfulPayments.reduce(
        (sum, payment) => sum + Number(payment.sellerAmount || 0),
        0,
      );
      const totalPaidOut = completedPayouts.reduce(
        (sum, payout) => sum + Number(payout.amount),
        0,
      );
      const totalPendingWithdrawals = pendingWithdrawals.reduce(
        (sum, withdrawal) => sum + Number(withdrawal.amount),
        0,
      );

      const availableBalance =
        totalEarnings - totalPaidOut - totalPendingWithdrawals;

      return {
        sellerId,
        sellerName: seller.name,
        totalEarnings,
        totalPaidOut,
        totalPendingWithdrawals,
        availableBalance,
        recentPayments: successfulPayments.slice(-10), // Last 10 payments
        recentPayouts: completedPayouts.slice(-5), // Last 5 payouts
        pendingWithdrawals,
        canWithdraw: availableBalance > 0,
      };
    });
  }

  /**
   * Create withdrawal request for host
   */
  async createWithdrawalRequest(
    sellerId: string,
    amount: number,
    currency?: string,
    description?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get seller balance to validate request
      const balance = await this.getHostBalance(sellerId);

      if (amount > balance.availableBalance) {
        throw new BadRequestException(
          `Insufficient balance. Available: ${balance.availableBalance}, Requested: ${amount}`,
        );
      }

      if (amount <= 0) {
        throw new BadRequestException(
          'Withdrawal amount must be greater than 0',
        );
      }

      // Check for existing pending withdrawal requests
      const existingPendingRequest = await tx.withdrawalRequest.findFirst({
        where: {
          sellerId: sellerId,
          status: 'PENDING',
        },
      });

      if (existingPendingRequest) {
        throw new BadRequestException(
          'You already have a pending withdrawal request. Please wait for admin approval.',
        );
      }

      // Create withdrawal request
      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          sellerId,
          amount: new Decimal(amount),
          currency: (currency as Currency) || Currency.USD,
          description: description || `Withdrawal request for ${amount}`,
          status: 'PENDING',
          requestedAt: new Date(),
        },
      });

      this.logger.log(
        `Created withdrawal request ${withdrawalRequest.id} for seller ${sellerId}`,
      );

      return withdrawalRequest;
    });
  }

  /**
   * Get host's withdrawal request history
   */
  async getHostWithdrawalRequests(sellerId: string) {
    const requests = await this.prisma.withdrawalRequest.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        adminNotes: true,
        createdAt: true,
      },
    });

    return requests;
  }

  /**
   * Get all withdrawal requests for admin review
   */
  async getAdminWithdrawalRequests(
    status?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const [requests, total] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              stripeAccountId: true,
            },
          },
        },
      }),
      this.prisma.withdrawalRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process withdrawal approval (admin only)
   */
  async processWithdrawalApproval(
    withdrawalRequestId: string,
    approved: boolean,
    adminNotes?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get withdrawal request
      const withdrawalRequest = await tx.withdrawalRequest.findUnique({
        where: { id: withdrawalRequestId },
        include: {
          seller: {
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
        throw new BadRequestException(
          'Withdrawal request has already been processed',
        );
      }

      const seller = withdrawalRequest.seller;
      if (!seller.stripeAccountId || !seller.stripeOnboardingComplete) {
        throw new BadRequestException(
          'Host has not completed Stripe onboarding',
        );
      }

      let transfer: Stripe.Transfer | null = null;

      if (approved) {
        // Process the actual payout
        transfer = await this.stripe.transfers.create({
          amount: Math.round(Number(withdrawalRequest.amount) * 100), // Convert to cents
          currency: withdrawalRequest.currency.toLowerCase(),
          destination: seller.stripeAccountId,
          description: `Withdrawal: ${withdrawalRequest.description}`,
          metadata: {
            withdrawalRequestId: withdrawalRequest.id,
            sellerId: seller.id,
          },
        });

        // Create transaction record for the payout
        await this.transactionService.createTransaction({
          type: TransactionType.SELLER_PAYOUT,
          amount: Number(withdrawalRequest.amount),
          currency: withdrawalRequest.currency as Currency,
          provider: PaymentProvider.STRIPE_CONNECT,
          payeeId: seller.id,
          stripeTransferId: transfer.id,
          stripeAccountId: seller.stripeAccountId,
          description: `Approved withdrawal: ${withdrawalRequest.description}`,
          notes: adminNotes,
        });
      }

      // Update withdrawal request status
      const updatedRequest = await tx.withdrawalRequest.update({
        where: { id: withdrawalRequestId },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          processedAt: new Date(),
          adminNotes: adminNotes || null,
          stripeTransferId: transfer?.id || null,
        },
      });

      this.logger.log(
        `${approved ? 'Approved' : 'Rejected'} withdrawal request ${withdrawalRequestId}`,
      );

      return {
        withdrawalRequest: updatedRequest,
        transfer,
      };
    });
  }

  /**
   * Get detailed earnings summary for host
   */
  async getHostEarningsSummary(hostId: string, period?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Verify host exists
      const host = await tx.user.findUnique({
        where: { id: hostId },
        select: { id: true, name: true },
      });

      if (!host) {
        throw new NotFoundException('Host not found');
      }

      // Calculate date range based on period
      let dateFilter = {};
      const now = new Date();

      if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { createdAt: { gte: startOfMonth } };
      } else if (period === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        dateFilter = { createdAt: { gte: startOfYear } };
      }

      // Get earnings data
      const earnings = await tx.transaction.findMany({
        where: {
          payeeId: hostId,
          type: TransactionType.BOOKING_PAYMENT,
          status: TransactionStatus.SUCCESS,
          ...dateFilter,
        },
        include: {
          event: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get payouts data
      const payouts = await tx.transaction.findMany({
        where: {
          payeeId: hostId,
          type: TransactionType.SELLER_PAYOUT,
          status: TransactionStatus.SUCCESS,
          ...dateFilter,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate summary statistics
      const totalGrossEarnings = earnings.reduce(
        (sum, earning) => sum + Number(earning.amount),
        0,
      );
      const totalPlatformFees = earnings.reduce(
        (sum, earning) => sum + Number(earning.platformFee || 0),
        0,
      );
      const totalNetEarnings = earnings.reduce(
        (sum, earning) => sum + Number(earning.sellerAmount || 0),
        0,
      );
      const totalPayouts = payouts.reduce(
        (sum, payout) => sum + Number(payout.amount),
        0,
      );

      // Group by month for trend analysis
      const monthlyData = earnings.reduce((acc, earning) => {
        const month = earning.createdAt.toISOString().substring(0, 7); // YYYY-MM
        if (!acc[month]) {
          acc[month] = {
            month,
            grossEarnings: 0,
            platformFees: 0,
            netEarnings: 0,
            bookingCount: 0,
          };
        }
        acc[month].grossEarnings += Number(earning.amount);
        acc[month].platformFees += Number(earning.platformFee || 0);
        acc[month].netEarnings += Number(earning.sellerAmount || 0);
        acc[month].bookingCount += 1;
        return acc;
      }, {});

      return {
        hostId,
        hostName: host.name,
        period: period || 'all',
        summary: {
          totalBookings: earnings.length,
          totalGrossEarnings,
          totalPlatformFees,
          totalNetEarnings,
          totalPayouts,
          pendingBalance: totalNetEarnings - totalPayouts,
          averageBookingValue:
            earnings.length > 0 ? totalGrossEarnings / earnings.length : 0,
        },
        monthlyBreakdown: Object.values(monthlyData),
        recentEarnings: earnings.slice(0, 10),
        recentPayouts: payouts.slice(0, 5),
      };
    });
  }

  // ============= PAYMENT METHOD MANAGEMENT =============
  // Card save functionality and payment method operations

  /**
   * Create setup intent for saving payment methods
   */
  async createSetupIntent(
    userId: string,
    paymentMethodType: string = 'card',
    returnUrl?: string,
  ) {
    try {
      // Get or create customer
      const customer = await this.getOrCreateCustomer(userId);

      if (!customer.id) {
        throw new BadRequestException('Failed to create customer');
      }

      // Create setup intent
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: [paymentMethodType],
        usage: 'off_session', // For future payments
        metadata: {
          userId,
          purpose: 'save_payment_method',
        },
      });

      this.logger.log(
        `Created setup intent ${setupIntent.id} for user ${userId}`,
      );

      return setupIntent;
    } catch (error) {
      this.logger.error('Failed to create setup intent:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create setup intent');
    }
  }

  /**
   *
   * Stripe createTransfer
   */

  async createTransfer({
    amount,
    currency,
    destination,
    description,
    sourceTransaction,
  }: {
    amount: number;
    currency: string;
    destination: string;
    description?: string;
    sourceTransaction?: string;
  }) {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency,
        destination,
        description,
        metadata: {
          sellerId: destination,
          bookingId: sourceTransaction || '',
        },
      });

      // Record payout transaction tied to the booking using a safe helper
      if (sourceTransaction) {
        await this.transactionService.processHostPayout(
          sourceTransaction,
          transfer.id,
          destination,
        );
      }

      return transfer;
    } catch (error) {
      this.logger.error('Failed to create transfer:', error);
      throw new InternalServerErrorException('Failed to create transfer');
    }
  }

  /**
   * Create a Stripe transfer ONLY (no DB writes). Useful when caller needs to wrap
   * all DB changes in a single Prisma transaction.
   */
  async createTransferRaw({
    amount,
    currency,
    destination,
    description,
    sourceTransaction,
  }: {
    amount: number;
    currency: string;
    destination: string;
    description?: string;
    sourceTransaction?: string;
  }) {
    try {
      const transfer = await this.stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency,
        destination,
        description,
        metadata: {
          sellerId: destination,
          bookingId: sourceTransaction || '',
        },
      });
      return transfer;
    } catch (error) {
      this.logger.error('Failed to create transfer (raw):', error);
      throw new InternalServerErrorException('Failed to create transfer');
    }
  }

  /**
   * Get current Stripe platform balance (available and pending) aggregated by a target currency.
   * Defaults to USD. Amounts returned in major units (e.g., dollars).
   */
  async getPlatformBalance(targetCurrency: Currency = Currency.USD) {
    const currency = (targetCurrency || Currency.USD).toString().toLowerCase();
    const bal = await this.stripe.balance.retrieve();
    const sumByCurrency = (
      items: Array<{ amount: number; currency: string }>,
    ) =>
      (items || [])
        .filter((i) => (i.currency || '').toLowerCase() === currency)
        .reduce((sum, i) => sum + (i.amount || 0), 0) / 100; // convert to major units
    return {
      available: sumByCurrency((bal as any).available || []),
      pending: sumByCurrency((bal as any).pending || []),
      instantAvailable: sumByCurrency((bal as any).instant_available || []),
      currency: targetCurrency,
      raw: bal,
    };
  }

  /**
   * Get platform payouts summary by status for a given currency.
   * Note: Limits to the latest 100 payouts per status for performance.
   */
  async getPlatformPayoutsSummary(targetCurrency: Currency = Currency.USD) {
    const currency = (targetCurrency || Currency.USD).toString().toLowerCase();
    const sum = (items: Stripe.ApiList<Stripe.Payout> | Stripe.Payout[]) => {
      const arr = Array.isArray(items) ? items : items.data;
      return (
        (arr || [])
          .filter((p) => (p.currency || '').toLowerCase() === currency)
          .reduce((s, p) => s + (p.amount || 0), 0) / 100
      ); // major units
    };

    const [paid, pending, inTransit, failed] = await Promise.all([
      this.stripe.payouts.list({ limit: 100, status: 'paid' }),
      this.stripe.payouts.list({ limit: 100, status: 'pending' }),
      this.stripe.payouts.list({ limit: 100, status: 'in_transit' }),
      this.stripe.payouts.list({ limit: 100, status: 'failed' }),
    ]);

    return {
      currency: targetCurrency,
      paid: sum(paid),
      pending: sum(pending),
      inTransit: sum(inTransit),
      failed: sum(failed),
      counts: {
        paid: paid.data.length,
        pending: pending.data.length,
        inTransit: inTransit.data.length,
        failed: failed.data.length,
      },
    };
  }

  /**
   * Reverse a Stripe transfer (best-effort compensation if DB transaction fails).
   */
  async reverseTransfer(transferId: string, amount?: number) {
    try {
      const params: any = {};
      if (typeof amount === 'number' && amount > 0) {
        params.amount = Math.round(amount * 100);
      }
      const reversal = await this.stripe.transfers.createReversal(
        transferId,
        params,
      );
      return reversal;
    } catch (error) {
      this.logger.error('Failed to reverse transfer:', error);
      // Do not throw further to avoid masking original error; bubble up in caller
      throw new InternalServerErrorException('Failed to reverse transfer');
    }
  }

  /**
   * Get customer's saved payment methods
   */
  async getCustomerPaymentMethods(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        return {
          paymentMethods: [],
          defaultPaymentMethod: null,
          hasPaymentMethods: false,
        };
      }

      // Get payment methods from Stripe
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      // Get customer to check default payment method
      const customer = await this.stripe.customers.retrieve(
        user.stripeCustomerId,
      );
      const defaultPaymentMethodId = (customer as any).invoice_settings
        ?.default_payment_method;

      // Format payment methods for frontend
      const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
              funding: pm.card.funding,
            }
          : null,
        isDefault: pm.id === defaultPaymentMethodId,
        created: pm.created,
      }));

      return {
        paymentMethods: formattedPaymentMethods,
        defaultPaymentMethod: defaultPaymentMethodId,
        hasPaymentMethods: formattedPaymentMethods.length > 0,
      };
    } catch (error) {
      this.logger.error('Failed to get payment methods:', error);
      throw new InternalServerErrorException(
        'Failed to retrieve payment methods',
      );
    }
  }

  /**
   * Set default payment method for customer
   */
  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        throw new NotFoundException('Customer not found');
      }

      // Verify payment method belongs to customer
      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.customer !== user.stripeCustomerId) {
        throw new ForbiddenException(
          'Payment method does not belong to this customer',
        );
      }

      // Update customer's default payment method
      const customer = await this.stripe.customers.update(
        user.stripeCustomerId,
        {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        },
      );

      this.logger.log(
        `Set default payment method ${paymentMethodId} for user ${userId}`,
      );

      return customer;
    } catch (error) {
      this.logger.error('Failed to set default payment method:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to set default payment method',
      );
    }
  }

  /**
   * Remove payment method from customer
   */
  async removePaymentMethod(userId: string, paymentMethodId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
      });

      if (!user?.stripeCustomerId) {
        throw new NotFoundException('Customer not found');
      }

      // Verify payment method belongs to customer
      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.customer !== user.stripeCustomerId) {
        throw new ForbiddenException(
          'Payment method does not belong to this customer',
        );
      }

      // Check if this is the only payment method
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 1) {
        throw new BadRequestException('Cannot remove the only payment method');
      }

      // Detach payment method from customer
      await this.stripe.paymentMethods.detach(paymentMethodId);

      this.logger.log(
        `Removed payment method ${paymentMethodId} for user ${userId}`,
      );

      return { success: true, paymentMethodId };
    } catch (error) {
      this.logger.error('Failed to remove payment method:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to remove payment method');
    }
  }

  // ============= UTILITY METHODS =============

  /**
   * Get Stripe customer or create if not exists
   */
  async getOrCreateCustomer(userId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const user = await client.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user?.stripeCustomerId) {
      return await this.stripe.customers.retrieve(user.stripeCustomerId);
    }

    // Create new customer
    const customer = await this.stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: {
        name: user.name || 'Unknown',
        email: user.email || 'no-email@example.com',
      },
    });

    // Update user with customer ID
    await client.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: customer.id,
      },
    });

    return customer;
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount: number, feePercentage?: number): number {
    const fee = feePercentage || this.platformFeePercentage;
    return Math.round(amount * (fee / 100));
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: Buffer, signature: string): boolean {
    try {
      const webhookSecret = this.configService.get<string>(
        'STRIPE_WEBHOOK_SECRET',
      );
      if (!webhookSecret) return false;

      this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve Checkout Session
   */
  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
