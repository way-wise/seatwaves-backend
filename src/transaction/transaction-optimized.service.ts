import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { TransactionService } from './transaction.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import {
  TransactionType,
  TransactionStatus,
  PaymentProvider,
  Currency,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

export interface CreateTransactionDto {
  type: TransactionType;
  status?: TransactionStatus;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  payerId?: string;
  payeeId?: string;
  bookingId?: string;
  couponId?: string;
  experienceId?: string;
  stripePaymentIntent?: string;
  stripeTransferId?: string;
  stripeAccountId?: string;
  stripeChargeId?: string;
  platformFee?: Decimal;
  hostAmount?: Decimal;
  externalTxnId?: string;
  parentTransactionId?: string;
  description?: string;
  notes?: string;
  metadata?: any;
  approvedById?: string;
}

@Injectable()
export class TransactionOptimizedService {
  private readonly logger = new Logger(TransactionOptimizedService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
    private transactionService: TransactionService,
    private configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-06-30.basil',
      });
    }
  }

  /**
   * Create transaction with proper validation and error handling
   */
  async createTransaction(data: CreateTransactionDto): Promise<any> {
    try {
      // Validate required fields
      this.validateTransactionData(data);

      // Validate user relationships
      await this.validateUserRelationships(data);

      const transaction = await this.prisma.transaction.create({
        data: {
          ...data,
          amount: new Decimal(data.amount),
          platformFee: data.platformFee || null,
          hostAmount: data.hostAmount || null,
          status: data.status || TransactionStatus.PENDING,
          createdAt: new Date(),
        },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
          booking: { select: { id: true } },
          experience: { select: { id: true, name: true } },
        },
      });

      // Invalidate relevant caches
      if (data.payerId) {
        await this.cacheService.invalidatePattern(`user:${data.payerId}:transactions`);
      }
      if (data.payeeId) {
        await this.cacheService.invalidatePattern(`user:${data.payeeId}:transactions`);
      }

      this.logger.log(
        `Transaction created: ${transaction.id} - Type: ${data.type} - Amount: ${data.amount}`,
      );

      return transaction;
    } catch (error) {
      this.logger.error('Failed to create transaction', error);
      throw new InternalServerErrorException('Transaction creation failed');
    }
  }

  /**
   * Get user transaction history with caching and pagination
   */
  async getUserTransactions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: TransactionType;
      status?: TransactionStatus;
    } = {},
  ): Promise<any> {
    const { page = 1, limit = 20, type, status } = options;
    const cacheKey = `user:${userId}:transactions:${page}:${limit}:${type || 'all'}:${status || 'all'}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        const where: Prisma.TransactionWhereInput = {
          OR: [{ payerId: userId }, { payeeId: userId }],
        };

        if (type) where.type = type;
        if (status) where.status = status;

        const [transactions, total] = await this.prisma.$transaction([
          this.prisma.transaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
              payer: { select: { id: true, name: true } },
              payee: { select: { id: true, name: true } },
              booking: { select: { id: true } },
              experience: { select: { id: true, name: true } },
            },
          }),
          this.prisma.transaction.count({ where }),
        ]);

        return {
          transactions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: skip + limit < total,
            hasPrev: page > 1,
          },
        };
      },
      600, // 10 minutes cache
    );
  }

  /**
   * Get host earnings summary with advanced analytics
   */
  async getHostEarningsSummary(hostId: string): Promise<any> {
    const cacheKey = `host:${hostId}:earnings:summary`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [
          totalEarnings,
          pendingEarnings,
          thisMonthEarnings,
          lastMonthEarnings,
          recentTransactions,
        ] = await this.prisma.$transaction([
          // Total earnings
          this.prisma.transaction.aggregate({
            where: {
              payeeId: hostId,
              type: TransactionType.HOST_PAYOUT,
              status: TransactionStatus.SUCCESS,
            },
            _sum: { amount: true },
          }),
          // Pending earnings
          this.prisma.transaction.aggregate({
            where: {
              payeeId: hostId,
              type: TransactionType.BOOKING_PAYMENT,
              status: TransactionStatus.SUCCESS,
            },
            _sum: { hostAmount: true },
          }),
          // This month earnings
          this.prisma.transaction.aggregate({
            where: {
              payeeId: hostId,
              type: TransactionType.HOST_PAYOUT,
              status: TransactionStatus.SUCCESS,
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
            _sum: { amount: true },
          }),
          // Last month earnings
          this.prisma.transaction.aggregate({
            where: {
              payeeId: hostId,
              type: TransactionType.HOST_PAYOUT,
              status: TransactionStatus.SUCCESS,
              createdAt: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
                lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              },
            },
            _sum: { amount: true },
          }),
          // Recent transactions
          this.prisma.transaction.findMany({
            where: {
              payeeId: hostId,
              type: { in: [TransactionType.BOOKING_PAYMENT, TransactionType.HOST_PAYOUT] },
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              experience: { select: { id: true, name: true } },
              booking: { select: { id: true } },
            },
          }),
        ]);

        return {
          totalEarnings: totalEarnings._sum.amount || 0,
          pendingEarnings: pendingEarnings._sum.hostAmount || 0,
          thisMonthEarnings: thisMonthEarnings._sum.amount || 0,
          lastMonthEarnings: lastMonthEarnings._sum.amount || 0,
          growthRate: this.calculateGrowthRate(
            Number(thisMonthEarnings._sum.amount || 0),
            Number(lastMonthEarnings._sum.amount || 0),
          ),
          recentTransactions,
        };
      },
      1800, // 30 minutes cache
    );
  }

  /**
   * Process refund with proper validation and rollback protection
   */
  async processRefund(
    transactionId: string,
    amount?: number,
    reason?: string,
  ): Promise<any> {
    const lockKey = `refund:${transactionId}`;

    return this.cacheService.getOrSet(
      lockKey,
      async () => {
        return this.prisma.$transaction(
          async (tx) => {
            const transaction = await tx.transaction.findUnique({
              where: { id: transactionId },
              include: {
                booking: true,
                experience: true,
              },
            });

            if (!transaction) {
              throw new NotFoundException('Transaction not found');
            }

            if (transaction.status !== TransactionStatus.SUCCESS) {
              throw new BadRequestException('Can only refund successful transactions');
            }

            if (!transaction.stripePaymentIntent) {
              throw new BadRequestException('No Stripe payment intent found');
            }

            const refundAmount = amount || Number(transaction.amount);
            if (refundAmount <= 0 || refundAmount > Number(transaction.amount)) {
              throw new BadRequestException('Invalid refund amount');
            }

            // Process Stripe refund
            const refund = await this.stripe.refunds.create({
              payment_intent: transaction.stripePaymentIntent,
              amount: Math.round(refundAmount * 100),
              reason: 'requested_by_customer',
              metadata: {
                originalTransactionId: transaction.id,
                reason: reason || 'Customer request',
              },
            });

            // Create refund transaction record
            const refundTransaction = await this.transactionService.createTransaction({
              type: TransactionType.BOOKING_REFUND,
              amount: refundAmount,
              currency: transaction.currency,
              provider: PaymentProvider.STRIPE_CONNECT,
              payerId: transaction.payeeId || undefined,
              payeeId: transaction.payerId || undefined,
              parentTransactionId: transaction.id,
              stripeChargeId: refund.id,
              description: `Refund for ${transaction.description}`,
              notes: reason,
            });

            // Update original transaction status
            const isPartialRefund = refundAmount < Number(transaction.amount);
            await tx.transaction.update({
              where: { id: transactionId },
              data: {
                status: isPartialRefund 
                  ? TransactionStatus.PARTIALLY_REFUNDED 
                  : TransactionStatus.FULLY_REFUNDED,
              },
            });

            // Update booking status if applicable
            if (transaction.bookingId) {
              await tx.booking.update({
                where: { id: transaction.bookingId },
                data: { status: 'REFUNDED' },
              });
            }

            this.logger.log(
              `Refund processed: ${refund.id} - Amount: ${refundAmount} - Original: ${transactionId}`,
            );

            return {
              success: true,
              refund: {
                id: refundTransaction.id,
                amount: refundAmount,
                stripeRefundId: refund.id,
              },
            };
          },
          {
            timeout: 30000,
            isolationLevel: 'Serializable',
          },
        );
      },
      60, // 1 minute cache to prevent duplicate refunds
    );
  }

  private validateTransactionData(data: CreateTransactionDto): void {
    if (data.amount <= 0) {
      throw new BadRequestException('Transaction amount must be positive');
    }

    if (!Object.values(TransactionType).includes(data.type)) {
      throw new BadRequestException('Invalid transaction type');
    }

    if (!Object.values(Currency).includes(data.currency)) {
      throw new BadRequestException('Invalid currency');
    }

    if (!Object.values(PaymentProvider).includes(data.provider)) {
      throw new BadRequestException('Invalid payment provider');
    }
  }

  private async validateUserRelationships(data: CreateTransactionDto): Promise<void> {
    const userIds = [data.payerId, data.payeeId, data.approvedById].filter(Boolean) as string[];
    
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });
      
      const foundIds = users.map(u => u.id);
      const missingIds = userIds.filter(id => !foundIds.includes(id));
      
      if (missingIds.length > 0) {
        throw new BadRequestException(`Invalid user IDs: ${missingIds.join(', ')}`);
      }
    }
  }

  private calculateGrowthRate(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
