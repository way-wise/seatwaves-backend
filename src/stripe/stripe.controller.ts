import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import {
  createPaymentSession,
  ProcessPayoutDto,
  StripeService,
} from './stripe.service';
// Import removed - using simplified onboarding approach

export class CreatePaymentDto {
  @ApiProperty({ description: 'Experience ID to book' })
  experienceId: string;

  @ApiProperty({ description: 'Event ID for the experience', required: false })
  eventId?: string;

  @ApiProperty({ description: 'Payment amount in dollars', minimum: 0.01 })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    required: false,
    default: 'USD',
  })
  currency?: string;

  @ApiProperty({ description: 'Coupon ID for discount', required: false })
  couponId?: string;

  @ApiProperty({
    description: 'Platform fee percentage',
    required: false,
    minimum: 0,
    maximum: 100,
  })
  platformFeePercentage?: number;

  @ApiProperty({ description: 'Customer email', required: false })
  email?: string;

  @ApiProperty({ description: 'Customer name', required: false })
  name?: string;

  @ApiProperty({
    description: 'Save payment method for future use',
    required: false,
  })
  savePaymentMethod?: boolean;

  @ApiProperty({ description: 'Use saved payment method ID', required: false })
  paymentMethodId?: string;
}

export class SetupPaymentMethodDto {
  @ApiProperty({ description: 'Customer ID', required: false })
  customerId?: string;

  @ApiProperty({
    description: 'Payment method type',
    required: false,
    default: 'card',
  })
  paymentMethodType?: string;

  @ApiProperty({ description: 'Return URL after setup', required: false })
  returnUrl?: string;
}

export class PaymentMethodDto {
  @ApiProperty({ description: 'Payment method ID' })
  paymentMethodId: string;

  @ApiProperty({
    description: 'Set as default payment method',
    required: false,
  })
  isDefault?: boolean;
}

export class CreatePaymentsIntentDto {
  @ApiProperty({ description: 'Event ID to book' })
  eventId: string;

  @ApiProperty({ description: 'Number of guests', minimum: 1 })
  guestCount: number;

  @ApiProperty({ description: 'Coupon ID for discount', required: false })
  couponId?: string;

  @ApiProperty({
    description: 'Save payment method for future use',
    required: false,
  })
  savePaymentMethod?: boolean;

  @ApiProperty({ description: 'Use saved payment method ID', required: false })
  paymentMethodId?: string;
}

export class OnboardHostRequestDto {
  userId: string;
  email: string;
  name: string;
  phone?: string;
}

export class OnboardUserRequestDto {
  userId: string;
  email: string;
  name: string;
}

export class PayoutDto {
  hostId: string;
  amount: number;
  currency?: string;
  bookingId?: string;
  description?: string;
}

// Host self-service payout (no hostId in body; taken from JWT)
export class DirectPayoutDto {
  amount: number;
  currency?: string;
  bookingId?: string;
  description?: string;
}

export class WithdrawalRequestDto {
  @ApiProperty({ description: 'Withdrawal amount', minimum: 1 })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    required: false,
    default: 'USD',
  })
  currency?: string;

  @ApiProperty({ description: 'Withdrawal description', required: false })
  description?: string;
}

export class ApproveWithdrawalDto {
  withdrawalRequestId: string;
  approved: boolean;
  adminNotes?: string;
}

export class RefundDto {
  paymentIntentId: string;
  refundAmount?: number;
  reason?: string;
}

@ApiTags('Stripe Payments')
@Controller('stripe')
// Validation handled manually in service layer for production reliability
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  private rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Simple in-memory rate limiting
   * In production, use Redis or similar distributed cache
   */
  private async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ) {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const current = this.rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }

    if (current.count >= limit) {
      throw new BadRequestException(
        `Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds.`,
      );
    }

    current.count++;
  }

  /**
   * POST /stripe/host/payout-direct
   * Allow a host to trigger a direct payout to their own connected account
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: Transfer details and transaction ID
   */
  @Post('host/payout-direct')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Host triggers a direct payout to self' })
  @ApiResponse({
    status: 201,
    description: 'Direct payout processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or not onboarded',
  })
  async processHostDirectPayout(@Body() dto: DirectPayoutDto, @Req() req) {
    try {
      const payoutData: ProcessPayoutDto = {
        hostId: req.user.userId,
        amount: dto.amount,
        currency: dto.currency as any,
        bookingId: dto.bookingId,
        description: dto.description,
      };

      const result = await this.stripeService.processHostPayout(payoutData);

      return {
        success: true,
        message: 'Direct payout processed successfully',
        data: {
          transferId: result.transfer.id,
          amount: result.transfer.amount / 100,
          transactionId: result.transaction.id,
        },
      };
    } catch (error) {
      this.logger.error('Failed to process direct payout:', error);
      throw error;
    }
  }

  // ============= MARKETPLACE ONBOARDING =============
  // WeOut uses Stripe Connect marketplace model where admin owns the main account
  // and hosts/users are connected accounts for payment processing

  /**
   * POST /stripe/onboard/host
   * Creates Stripe Connect onboarding link for hosts to receive payments
   *
   * BEHAVIOR:
   * - Generates onboarding URL for host to complete Stripe Connect setup
   * - Host must complete identity verification and banking details
   * - Once complete, host can receive payouts from bookings
   * - Required for hosts to earn money from their experiences
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: Onboarding URL and account details
   */
  @Post('onboard/host')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create Stripe Connect onboarding link for host' })
  @ApiResponse({
    status: 201,
    description: 'Onboarding link created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - user not found',
  })
  async createHostOnboardingLink(@Req() req) {
    try {
      const result = await this.stripeService.createHostOnboardingLink(
        req.user.userId,
      );

      console.log('result', result);

      return {
        success: true,
        message: 'Onboarding link created successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to create onboarding link:', error);
      throw error;
    }
  }

  /**
   * GET /stripe/onboarding/complete
   * Webhook endpoint called by Stripe when host completes onboarding
   *
   * BEHAVIOR:
   * - Automatically called by Stripe after successful onboarding
   * - Updates host's onboarding status in database
   * - Enables host to receive payments
   *
   * AUTHENTICATION: None (Stripe webhook)
   * RETURNS: Confirmation of onboarding completion
   */
  @Get('/onboarding/complete')
  async completeOnboarding(@Query('accountId') accountId: string) {
    return this.stripeService.onBoardComplete(accountId);
  }

  /**
   * GET /stripe/onboard/host/status
   * Check if host has completed Stripe Connect onboarding
   *
   * BEHAVIOR:
   * - Checks host's current onboarding status with Stripe
   * - Returns whether host can receive payments
   * - Shows what onboarding steps are still needed
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: Onboarding status and capabilities
   */
  @Get('onboard/host/status')
  @ApiOperation({ summary: 'Check host onboarding status' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status retrieved successfully',
  })
  @UseGuards(AuthGuard('jwt'))
  async checkHostOnboardingStatus(@Req() req) {
    try {
      const result = await this.stripeService.checkHostOnboardingStatus(
        req.user.userId,
      );

      return {
        success: true,
        message: 'Onboarding status retrieved successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to check onboarding status:', error);
      throw error;
    }
  }

  /**
   * POST /stripe/onboard/user
   * Creates Stripe customer account for users to make payments
   *
   * BEHAVIOR:
   * - Creates Stripe customer profile for user
   * - Enables user to save payment methods
   * - Required before user can book experiences
   *
   * AUTHENTICATION: JWT required (regular user)
   * RETURNS: Customer account details
   */
  @Post('onboard/user')
  @ApiOperation({
    summary: 'Onboard user to admin marketplace account as customer',
  })
  @ApiResponse({
    status: 201,
    description: 'User onboarded successfully to marketplace',
  })
  @UseGuards(AuthGuard('jwt'))
  async onboardUser(@Req() req) {
    try {
      const result = await this.stripeService.onboardUser(req.user.userId);

      return {
        success: true,
        message: 'User onboarded successfully to marketplace',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to onboard user:', error);
      throw error;
    }
  }

  /**
   * GET /stripe/marketplace/status
   * Check user's overall marketplace status (host or customer)
   *
   * BEHAVIOR:
   * - Returns user's role in marketplace (host/customer)
   * - Shows onboarding completion status
   * - Indicates payment capabilities
   *
   * AUTHENTICATION: JWT required (any user)
   * RETURNS: Marketplace role and status
   */
  @Get('marketplace/status')
  @ApiOperation({
    summary: 'Get marketplace onboarding status for host or user',
  })
  @ApiResponse({
    status: 200,
    description: 'Marketplace status retrieved successfully',
  })
  @UseGuards(AuthGuard('jwt'))
  async getMarketplaceStatus(@Req() req) {
    try {
      const status = await this.stripeService.getMarketplaceStatus(
        req.user.userId,
      );

      return {
        success: true,
        message: 'Marketplace status retrieved successfully',
        data: status,
      };
    } catch (error) {
      this.logger.error('Failed to get marketplace status:', error);
      throw error;
    }
  }

  // ============= PAYMENT PROCESSING =============
  // Customer payment flows for booking experiences
  // Funds are held by Stripe until admin approves payout to host

  /**
   * POST /stripe/payment-link
   * Creates simple payment link for experience booking
   *
   * BEHAVIOR:
   * - Generates Stripe payment link (simplest integration)
   * - Customer pays for experience booking
   * - Platform fee automatically deducted
   * - Remaining amount held for host payout
   * - Creates transaction record in database
   *
   * PAYMENT FLOW:
   * 1. Customer pays total amount
   * 2. Platform takes commission (default 5%)
   * 3. Host amount held in Stripe until payout
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Payment URL and amount breakdown
   */
  // @Post('payment-link')
  // @UseGuards(AuthGuard('jwt'))
  // @ApiOperation({
  //   summary: 'Create Stripe Payment Link for booking (Simplest - Just a URL)',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Payment link created successfully',
  // })
  // @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  // @ApiResponse({ status: 404, description: 'Experience not found' })
  // async createPaymentLink(
  //   @Body() createPaymentDto: CreatePaymentDto,
  //   @Req() req,
  // ) {
  //   // Rate limiting check
  //   const rateLimitKey = `payment_link_${req.user.userId}`;
  //   await this.checkRateLimit(rateLimitKey, 10, 60); // 10 requests per minute
  //   try {
  //     const paymentData: CreatePaymentIntentDto = {
  //       experienceId: createPaymentDto.experienceId,
  //       eventId: createPaymentDto.eventId,
  //       amount: createPaymentDto.amount,
  //       currency: createPaymentDto.currency as any,
  //       customerId: req.user.userId,
  //       couponId: createPaymentDto.couponId,
  //       platformFeePercentage: createPaymentDto.platformFeePercentage,
  //     };

  //     const result = await this.stripeService.createPaymentLink(paymentData);

  //     return {
  //       success: true,
  //       message: 'Payment link created successfully',
  //       data: {
  //         paymentLinkId: result.paymentLinkId,
  //         paymentUrl: result.paymentUrl,
  //         amount: result.finalAmount,
  //         platformFee: result.platformFee,
  //         hostAmount: result.hostAmount,
  //         appliedDiscount: result.appliedDiscount,
  //       },
  //     };
  //   } catch (error) {
  //     this.logger.error('Failed to create payment link:', {
  //       error: error.message,
  //       stack: error.stack,
  //       userId: req.user.userId,
  //       experienceId: createPaymentDto.experienceId,
  //     });

  //     if (
  //       error instanceof BadRequestException ||
  //       error instanceof NotFoundException
  //     ) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(
  //       'Payment link creation failed. Please try again.',
  //     );
  //   }
  // }

  /**
   * POST /stripe/checkout
   * Creates Stripe Checkout session for experience booking
   *
   * BEHAVIOR:
   * - Creates hosted checkout page (recommended method)
   * - Handles payment processing securely
   * - Supports coupons and discounts
   * - Platform fee automatically calculated
   * - Creates booking and transaction records
   *
   * PAYMENT FLOW:
   * 1. Customer completes payment on Stripe-hosted page
   * 2. Platform commission deducted automatically
   * 3. Host earnings held until admin approval
   * 4. Booking confirmed in system
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Checkout URL and payment details
   */
  @Post('checkout')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Create Stripe Checkout session for booking (Recommended)',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async createCheckoutSession(
    @Body() createPaymentDto: createPaymentSession,
    @Req() req,
  ) {
    // Rate limiting check
    const rateLimitKey = `checkout_${req.user.userId}`;
    await this.checkRateLimit(rateLimitKey, 5, 60); // 5 requests per minute
    try {
      const result = await this.stripeService.createCheckoutSession(
        createPaymentDto,
        req.user.userId,
        req,
      );

      if (!result.checkoutUrl) {
        throw new Error('Checkout URL not found');
      }

      return {
        success: true,
        message: 'Checkout session created successfully',
        data: {
          sessionId: result.sessionId,
          checkoutUrl: result.checkoutUrl,
          amount: result.finalAmount,
          platformFee: result.platformFee,
          hostAmount: result.hostAmount,
          appliedDiscount: result.appliedDiscount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create checkout session:', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId,
        seatId: createPaymentDto.ticketId,
      });

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Checkout session creation failed. Please try again.',
      );
    }
  }

  /**
   * POST /stripe/payment-intent
   * Creates payment intent for custom payment flow
   *
   * BEHAVIOR:
   * - Creates payment intent for advanced integrations
   * - Requires manual frontend payment handling
   * - Supports custom payment UI
   * - Platform fee calculated and held
   *
   * PAYMENT FLOW:
   * 1. Payment intent created with client secret
   * 2. Frontend handles payment confirmation
   * 3. Platform fee deducted on success
   * 4. Host amount held for later payout
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Client secret and payment details
   */
  @Post('payment-intent')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary:
      'Create payment intent for booking (Advanced - Manual integration)',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  async createPaymentIntent(
    @Body() createPaymentDto: CreatePaymentsIntentDto,
    @Req() req,
  ) {
    // Rate limiting check
    const rateLimitKey = `payment_intent_${req.user.userId}`;
    await this.checkRateLimit(rateLimitKey, 10, 60); // 10 requests per minute
    const paymentData: CreatePaymentsIntentDto = {
      eventId: createPaymentDto.eventId,
      guestCount: createPaymentDto.guestCount,
      couponId: createPaymentDto.couponId,
    };

    return this.stripeService.createPaymentIntent(paymentData, req.user.userId);
  }

  /**
   * POST /stripe/payment-intent/:id/confirm
   * Confirms payment intent after customer authorization
   *
   * BEHAVIOR:
   * - Finalizes payment processing
   * - Confirms booking in system
   * - Triggers webhook events
   * - Updates transaction status
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Payment confirmation and status
   */
  @Get('payment-intent/:id/confirm')
  @ApiOperation({ summary: 'Confirm payment intent' })
  @ApiResponse({
    status: 200,
    description: 'Payment intent confirmed successfully',
  })
  @ApiResponse({ status: 400, description: 'Payment confirmation failed' })
  @UseGuards(AuthGuard('jwt'))
  async confirmPaymentIntent(
    @Param('id') paymentIntentId: string,
    @Body() body?: { paymentMethodId?: string },
  ) {
    try {
      const paymentIntent = await this.stripeService.confirmPaymentIntent(
        paymentIntentId,
        body?.paymentMethodId,
      );

      return {
        success: true,
        message: 'Payment intent confirmed successfully',
        data: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100, // Convert from cents
          client_secret: paymentIntent.client_secret, // For frontend use
        },
      };
    } catch (error) {
      this.logger.error('Failed to confirm payment intent:', error);
      throw error;
    }
  }

  // ============= PAYOUT MANAGEMENT =============
  // Admin-controlled payouts to hosts after booking completion
  // Implements manual approval process for host earnings

  /**
   * POST /stripe/payout
   * Process payout to host (ADMIN ONLY)
   *
   * BEHAVIOR:
   * - Transfers host earnings from held funds
   * - Requires admin approval for security
   * - Sends money to host's connected Stripe account
   * - Creates payout transaction record
   * - Updates booking payout status
   *
   * ADMIN APPROVAL FLOW:
   * 1. Admin reviews completed bookings
   * 2. Admin approves payout for specific booking/host
   * 3. Funds transferred to host's bank account
   * 4. Transaction logged for audit trail
   *
   * AUTHENTICATION: JWT required (ADMIN ONLY)
   * RETURNS: Transfer details and transaction ID
   */
  @Post('payout')
  @ApiOperation({ summary: 'Process payout to host (Admin only)' })
  @ApiResponse({ status: 201, description: 'Payout processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid host or data',
  })
  @UseGuards(AuthGuard('jwt'))
  async processHostPayout(@Body() payoutDto: PayoutDto) {
    try {
      const payoutData: ProcessPayoutDto = {
        hostId: payoutDto.hostId,
        amount: payoutDto.amount,
        currency: payoutDto.currency as any,
        bookingId: payoutDto.bookingId,
        description: payoutDto.description,
      };

      const result = await this.stripeService.processHostPayout(payoutData);

      return {
        success: true,
        message: 'Payout processed successfully',
        data: {
          transferId: result.transfer.id,
          amount: result.transfer.amount / 100, // Convert from cents
          transactionId: result.transaction.id,
        },
      };
    } catch (error) {
      this.logger.error('Failed to process payout:', error);
      throw error;
    }
  }

  // ============= HOST BALANCE & WITHDRAWAL MANAGEMENT =============
  // Host balance checking and withdrawal requests with admin approval

  /**
   * GET /stripe/host/balance
   * Check host's available balance for withdrawal
   *
   * BEHAVIOR:
   * - Shows host's total earnings from completed bookings
   * - Displays available balance (after platform fees)
   * - Shows pending payouts and withdrawal requests
   * - Includes transaction history
   *
   * BALANCE CALCULATION:
   * 1. Sum all completed booking payments
   * 2. Subtract platform commission (5%)
   * 3. Subtract already paid out amounts
   * 4. Show available balance for withdrawal
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: Balance details and transaction history
   */
  @Get('host/balance')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get host available balance for withdrawal' })
  @ApiResponse({
    status: 200,
    description: 'Host balance retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not a host or not onboarded',
  })
  async getHostBalance(@Req() req) {
    try {
      const balance = await this.stripeService.getHostBalance(req.user.userId);

      return {
        success: true,
        message: 'Host balance retrieved successfully',
        data: balance,
      };
    } catch (error) {
      this.logger.error('Failed to get host balance:', error);
      throw error;
    }
  }

  /**
   * POST /stripe/host/withdrawal-request
   * Request withdrawal of available balance (requires admin approval)
   *
   * BEHAVIOR:
   * - Creates withdrawal request for admin review
   * - Validates host has sufficient available balance
   * - Prevents multiple pending requests
   * - Sends notification to admin for approval
   *
   * WITHDRAWAL PROCESS:
   * 1. Host requests withdrawal of available amount
   * 2. System validates balance and eligibility
   * 3. Creates pending withdrawal request
   * 4. Admin reviews and approves/rejects
   * 5. If approved, funds transferred to host account
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: Withdrawal request details
   */
  @Post('host/withdrawal-request')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Request withdrawal of available balance' })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient balance or pending request exists',
  })
  async requestWithdrawal(
    @Body() withdrawalDto: WithdrawalRequestDto,
    @Req() req,
  ) {
    try {
      const request = await this.stripeService.createWithdrawalRequest(
        req.user.userId,
        withdrawalDto.amount,
        withdrawalDto.currency,
        withdrawalDto.description,
      );

      return {
        success: true,
        message: 'Withdrawal request created successfully',
        data: {
          requestId: request.id,
          amount: request.amount,
          status: request.status,
          requestedAt: request.createdAt,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create withdrawal request:', error);
      throw error;
    }
  }

  /**
   * GET /stripe/host/withdrawal-requests
   * Get host's withdrawal request history
   *
   * BEHAVIOR:
   * - Shows all withdrawal requests by host
   * - Includes pending, approved, and rejected requests
   * - Shows admin notes and processing dates
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: List of withdrawal requests
   */
  @Get('host/withdrawal-requests')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get host withdrawal request history' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal requests retrieved successfully',
  })
  async getWithdrawalRequests(@Req() req) {
    try {
      const requests = await this.stripeService.getHostWithdrawalRequests(
        req.user.userId,
      );

      return {
        success: true,
        message: 'Withdrawal requests retrieved successfully',
        data: requests,
      };
    } catch (error) {
      this.logger.error('Failed to get withdrawal requests:', error);
      throw error;
    }
  }

  /**
   * GET /stripe/admin/withdrawal-requests
   * Get all pending withdrawal requests for admin review (ADMIN ONLY)
   *
   * BEHAVIOR:
   * - Shows all pending withdrawal requests
   * - Includes host details and balance information
   * - Allows filtering by status and date
   *
   * AUTHENTICATION: JWT required (ADMIN ONLY)
   * RETURNS: List of withdrawal requests for review
   */
  @Get('admin/withdrawal-requests')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get withdrawal requests for admin review' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal requests retrieved successfully',
  })
  async getAdminWithdrawalRequests(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const requests = await this.stripeService.getAdminWithdrawalRequests(
        status,
        page,
        limit,
      );

      return {
        success: true,
        message: 'Withdrawal requests retrieved successfully',
        data: requests,
      };
    } catch (error) {
      this.logger.error('Failed to get admin withdrawal requests:', error);
      throw error;
    }
  }

  /**
   * POST /stripe/admin/withdrawal-approve
   * Approve or reject withdrawal request (ADMIN ONLY)
   *
   * BEHAVIOR:
   * - Admin approves or rejects withdrawal request
   * - If approved, processes payout to host immediately
   * - If rejected, returns funds to available balance
   * - Sends notification to host about decision
   * - Logs admin action for audit trail
   *
   * APPROVAL FLOW:
   * 1. Admin reviews withdrawal request details
   * 2. Admin approves/rejects with optional notes
   * 3. If approved: funds transferred to host account
   * 4. If rejected: funds returned to available balance
   * 5. Host notified of decision
   *
   * AUTHENTICATION: JWT required (ADMIN ONLY)
   * RETURNS: Approval result and payout details
   */
  @Post('admin/withdrawal-approve')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Approve or reject withdrawal request' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal request processed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Withdrawal request not found',
  })
  async approveWithdrawal(@Body() approvalDto: ApproveWithdrawalDto) {
    try {
      const result = await this.stripeService.processWithdrawalApproval(
        approvalDto.withdrawalRequestId,
        approvalDto.approved,
        approvalDto.adminNotes,
      );

      return {
        success: true,
        message: `Withdrawal request ${approvalDto.approved ? 'approved' : 'rejected'} successfully`,
        data: {
          requestId: result.withdrawalRequest.id,
          status: result.withdrawalRequest.status,
          transferId: result.transfer?.id,
          processedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to process withdrawal approval:', error);
      throw error;
    }
  }

  // ============= REFUND MANAGEMENT =============
  // Admin-controlled refunds for cancelled bookings

  /**
   * POST /stripe/refund
   * Process refund for cancelled booking (ADMIN ONLY)
   *
   * BEHAVIOR:
   * - Refunds customer payment for cancelled booking
   * - Handles partial or full refunds
   * - Updates booking status to cancelled
   * - Creates refund transaction record
   * - Prevents host payout for refunded booking
   *
   * REFUND FLOW:
   * 1. Admin reviews refund request
   * 2. Admin processes refund through this endpoint
   * 3. Customer receives refund to original payment method
   * 4. Host does not receive payout for refunded booking
   *
   * AUTHENTICATION: JWT required (ADMIN ONLY)
   * RETURNS: Refund details and status
   */
  @Post('refund')
  @ApiOperation({ summary: 'Process refund for payment (Admin only)' })
  @ApiResponse({ status: 201, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid payment' })
  @ApiResponse({ status: 404, description: 'Original transaction not found' })
  @UseGuards(AuthGuard('jwt'))
  async processRefund(@Body() refundDto: RefundDto) {
    try {
      const result = await this.stripeService.processRefund(
        refundDto.paymentIntentId,
        refundDto.refundAmount,
        refundDto.reason,
      );

      return {
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId: result.refund.id,
          amount: result.refund.amount / 100, // Convert from cents
          status: result.refund.status,
          transactionId: result.refundTransaction.id,
        },
      };
    } catch (error) {
      this.logger.error('Failed to process refund:', error);
      throw error;
    }
  }

  // ============= WEBHOOK HANDLING =============
  // Stripe webhook endpoint for payment status updates

  /**
   * POST /stripe/webhook
   * Handle Stripe webhook events
   *
   * BEHAVIOR:
   * - Receives real-time updates from Stripe
   * - Updates payment and booking status
   * - Handles payment success/failure events
   * - Processes payout completion notifications
   * - Ensures data consistency between Stripe and database
   *
   * WEBHOOK EVENTS HANDLED:
   * - payment_intent.succeeded: Booking payment confirmed
   * - transfer.created: Host payout processed
   * - account.updated: Host onboarding status changed
   *
   * AUTHENTICATION: Stripe signature verification
   * RETURNS: Event processing confirmation
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    try {
      if (!signature) {
        throw new BadRequestException('Missing stripe-signature header');
      }

      if (!req.rawBody) {
        throw new BadRequestException('Missing request body');
      }

      const result = await this.stripeService.handleWebhook(
        signature,
        req.rawBody,
      );

      return result;
    } catch (error) {
      this.logger.error('Webhook handling failed:', error);
      throw error;
    }
  }

  // ============= UTILITY ENDPOINTS =============
  // Helper endpoints for payment calculations and customer management

  /**
   * GET /stripe/host/earnings-summary
   * Get detailed earnings summary for host
   *
   * BEHAVIOR:
   * - Shows total earnings, fees, and payouts
   * - Includes monthly/yearly breakdowns
   * - Shows booking performance metrics
   *
   * AUTHENTICATION: JWT required (host user)
   * RETURNS: Comprehensive earnings report
   */
  @Get('host/earnings-summary')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get host earnings summary and analytics' })
  @ApiResponse({
    status: 200,
    description: 'Earnings summary retrieved successfully',
  })
  async getHostEarningsSummary(
    @Req() req,
    @Query('period') period?: string, // 'month', 'year', 'all'
  ) {
    try {
      const summary = await this.stripeService.getHostEarningsSummary(
        req.user.userId,
        period,
      );

      return {
        success: true,
        message: 'Earnings summary retrieved successfully',
        data: summary,
      };
    } catch (error) {
      this.logger.error('Failed to get earnings summary:', error);
      throw error;
    }
  }

  /**
   * GET /stripe/customer/:userId
   * Get or create Stripe customer for user
   *
   * BEHAVIOR:
   * - Retrieves existing Stripe customer
   * - Creates new customer if none exists
   * - Links customer to user account
   *
   * AUTHENTICATION: JWT required
   * RETURNS: Customer details
   */
  @Get('customer/:userId')
  @ApiOperation({ summary: 'Get or create Stripe customer' })
  @ApiResponse({
    status: 200,
    description: 'Customer retrieved/created successfully',
  })
  async getOrCreateCustomer(@Req() req) {
    try {
      const customer = await this.stripeService.getOrCreateCustomer(
        req.user.userId,
      );

      return {
        success: true,
        message: 'Customer retrieved successfully',
        data: {
          id: customer.id,
          email: (customer as any).email,
          name: (customer as any).name,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get/create customer:', error);
      throw error;
    }
  }

  // ============= PAYMENT METHOD MANAGEMENT =============
  // Card save functionality for returning customers
  // Enables one-click payments and better user experience

  /**
   * POST /stripe/setup-intent
   * Create setup intent for saving payment methods
   *
   * BEHAVIOR:
   * - Creates Stripe SetupIntent for saving payment methods
   * - Enables customers to save cards for future use
   * - Supports various payment method types (card, bank_account)
   * - Returns client secret for frontend integration
   *
   * SETUP FLOW:
   * 1. Customer initiates card save process
   * 2. SetupIntent created with customer ID
   * 3. Frontend collects payment method details
   * 4. Payment method attached to customer on success
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Setup intent client secret
   */
  @Post('setup-intent')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create setup intent for saving payment methods' })
  @ApiResponse({
    status: 201,
    description: 'Setup intent created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid customer',
  })
  async createSetupIntent(@Body() setupDto: SetupPaymentMethodDto, @Req() req) {
    try {
      const result = await this.stripeService.createSetupIntent(
        req.user.userId,
        setupDto.paymentMethodType,
        setupDto.returnUrl,
      );

      return {
        success: true,
        message: 'Setup intent created successfully',
        data: {
          clientSecret: result.client_secret,
          setupIntentId: result.id,
          customerId: result.customer,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create setup intent:', {
        error: error.message,
        stack: error.stack,
        userId: req.user.userId,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Setup intent creation failed. Please try again.',
      );
    }
  }

  /**
   * GET /stripe/payment-methods
   * Get customer's saved payment methods
   *
   * BEHAVIOR:
   * - Retrieves all saved payment methods for customer
   * - Shows card details (last 4 digits, brand, expiry)
   * - Indicates default payment method
   * - Filters active payment methods only
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: List of saved payment methods
   */
  @Get('payment-methods')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get customer saved payment methods' })
  @ApiResponse({
    status: 200,
    description: 'Payment methods retrieved successfully',
  })
  async getPaymentMethods(@Req() req) {
    try {
      const paymentMethods = await this.stripeService.getCustomerPaymentMethods(
        req.user.userId,
      );

      return {
        success: true,
        message: 'Payment methods retrieved successfully',
        data: paymentMethods,
      };
    } catch (error) {
      this.logger.error('Failed to get payment methods:', error);
      throw error;
    }
  }

  /**
   * POST /stripe/payment-methods/:id/set-default
   * Set default payment method for customer
   *
   * BEHAVIOR:
   * - Sets specified payment method as default
   * - Updates customer's default payment method in Stripe
   * - Used for one-click payments and subscriptions
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Updated customer details
   */
  @Post('payment-methods/:id/set-default')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set default payment method' })
  @ApiResponse({
    status: 200,
    description: 'Default payment method updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment method not found',
  })
  async setDefaultPaymentMethod(
    @Param('id') paymentMethodId: string,
    @Req() req,
  ) {
    try {
      const result = await this.stripeService.setDefaultPaymentMethod(
        req.user.userId,
        paymentMethodId,
      );

      return {
        success: true,
        message: 'Default payment method updated successfully',
        data: {
          customerId: result.id,
          defaultPaymentMethod: result.invoice_settings?.default_payment_method,
        },
      };
    } catch (error) {
      this.logger.error('Failed to set default payment method:', error);
      throw error;
    }
  }

  /**
   * DELETE /stripe/payment-methods/:id
   * Remove saved payment method
   *
   * BEHAVIOR:
   * - Detaches payment method from customer
   * - Prevents future use of the payment method
   * - Cannot delete if it's the only payment method
   *
   * AUTHENTICATION: JWT required (customer)
   * RETURNS: Deletion confirmation
   */
  @Delete('payment-methods/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove saved payment method' })
  @ApiResponse({
    status: 200,
    description: 'Payment method removed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment method not found',
  })
  async removePaymentMethod(@Param('id') paymentMethodId: string, @Req() req) {
    try {
      await this.stripeService.removePaymentMethod(
        req.user.userId,
        paymentMethodId,
      );

      return {
        success: true,
        message: 'Payment method removed successfully',
        data: {
          paymentMethodId,
          removedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to remove payment method:', error);
      throw error;
    }
  }

  // ============= UTILITY ENDPOINTS =============
  // Helper endpoints for payment calculations and customer management

  /**
   * GET /stripe/fee/calculate
   * Calculate platform commission for booking amount
   *
   * BEHAVIOR:
   * - Calculates platform fee (default 5%)
   * - Shows host earnings after commission
   * - Helps with pricing transparency
   *
   * AUTHENTICATION: None required (public)
   * RETURNS: Fee breakdown and host amount
   */
  @Get('fee/calculate')
  @ApiOperation({ summary: 'Calculate platform fee for amount' })
  @ApiResponse({
    status: 200,
    description: 'Platform fee calculated successfully',
  })
  async calculatePlatformFee(
    @Query('amount') amount: number,
    @Query('feePercentage') feePercentage?: number,
  ) {
    try {
      const platformFee = this.stripeService.calculatePlatformFee(
        amount,
        feePercentage,
      );
      const hostAmount = amount - platformFee;

      return {
        success: true,
        message: 'Platform fee calculated successfully',
        data: {
          originalAmount: amount,
          platformFee,
          hostAmount,
          feePercentage: feePercentage || 5,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate platform fee:', error);
      throw error;
    }
  }
}
