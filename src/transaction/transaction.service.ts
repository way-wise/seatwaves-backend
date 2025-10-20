import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  TransactionType,
  TransactionStatus,
  Currency,
  PaymentProvider,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionQuery, transactionQuerySchema } from './dto/query.dto';
import { adminTransactionQuerySchema } from './dto/admin.query.dto';

export interface CreateTransactionDto {
  type: TransactionType;
  amount: number;
  currency?: Currency;
  provider: PaymentProvider; // Make this required to match schema
  payerId?: string;
  payeeId?: string;
  bookingId?: string;
  couponId?: string;
  experienceId?: string;
  stripePaymentIntent?: string;
  stripeTransferId?: string;
  stripeAccountId?: string;
  stripeChargeId?: string;
  platformFee?: number;
  sellerAmount?: number;
  externalTxnId?: string;
  parentTransactionId?: string;
  notes?: string;
  description?: string;
}

export interface TransactionFilters {
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  bookingId?: string;
  couponId?: string;
  experienceId?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionAnalytics {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  byType: Record<string, { amount: number; count: number }>;
  byStatus: Record<string, { amount: number; count: number }>;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  
  constructor(private prisma: PrismaService) {}

  // ============= CORE TRANSACTION OPERATIONS =============

  async createTransaction(data: CreateTransactionDto) {
    return this.prisma.$transaction(async (tx) => {
      this.logger.log(`Creating transaction: ${data.type} from ${data.payerId} to ${data.payeeId}`);
      // Validate relationships exist
      const payer = await tx.user.findUnique({
        where: { id: data.payerId },
      });
      // Validate payer exists if provided
      if (!payer) throw new BadRequestException('Payer not found');
      if (!payer.stripeCustomerId)
        throw new BadRequestException('Payer not onboarded to Stripe');

      // Validate payee exists
      const payee = await tx.user.findUnique({ where: { id: data.payeeId } });
      if (!payee) throw new BadRequestException('Payee not found');

      if (!payee.stripeCustomerId)
        throw new BadRequestException('Payee not onboarded to Stripe');

      // if (data.bookingId) {
      //   const booking = await tx.booking.findFirst({
      //     where: { id: data.bookingId },
      //   });
      //   if (!booking) throw new BadRequestException('Booking not found');
      // }

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          type: data.type,
          amount: new Decimal(data.amount),
          currency: data.currency || Currency.USD,
          provider: data.provider,
          payerId: data.payerId,
          payeeId: data.payeeId,
          bookingId: data.bookingId,
          eventId: data.experienceId,
          stripePaymentIntent: data.stripePaymentIntent,
          stripeTransferId: data.stripeTransferId,
          stripeAccountId: data.stripeAccountId,
          stripeChargeId: data.stripeChargeId,
          platformFee: data.platformFee ? new Decimal(data.platformFee) : null,
          sellerAmount: data.sellerAmount
            ? new Decimal(data.sellerAmount)
            : null,
          externalTxnId: data.externalTxnId,
          description: data.description,
          notes: data.notes,
        },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
          booking: { select: { id: true } },
        },
      });

      return transaction;
    });
  }

  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    metadata?: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { stripePaymentIntent: transactionId },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === TransactionStatus.SUCCESS) {
        updateData.processedAt = new Date();
      }

      if (metadata) {
        updateData.metadata = {
          ...(transaction.metadata as any),
          ...metadata,
        };
      }

      return tx.transaction.update({
        where: { id: transaction.id },
        data: updateData,
        include: {
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
          booking: true,
          event: true,
        },
      });
    });
  }

  // ============= BOOKING PAYMENT FLOWS =============

  async processBookingPayment(
    bookingId: string,
    amount: number,
    platformFeePercentage: number,
    stripePaymentIntent: string,
    customerId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Get booking with experience and host info
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          ticket: {
            include: { event: true },
          },
        },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      const platformFee = (amount * platformFeePercentage) / 100;
      const sellerAmount = amount - platformFee;

      // Create main payment transaction
      const paymentTransaction = await tx.transaction.create({
        data: {
          type: TransactionType.BOOKING_PAYMENT,
          amount: new Decimal(amount),
          currency: Currency.USD,
          provider: PaymentProvider.STRIPE_CONNECT,
          payerId: customerId,
          bookingId: bookingId,
          eventId: booking.ticket.eventId,
          stripePaymentIntent,
          platformFee: new Decimal(platformFee),
          sellerAmount: new Decimal(sellerAmount),
          description: `Booking payment for ${booking.ticket.event.title}`,
          status: TransactionStatus.SUCCESS,
          processedAt: new Date(),
        },
      });

      // Create platform commission record
      await tx.transaction.create({
        data: {
          type: TransactionType.ADMIN_COMMISSION,
          amount: new Decimal(platformFee),
          currency: Currency.USD,
          provider: PaymentProvider.STRIPE_CONNECT,
          parentTransactionId: paymentTransaction.id,
          eventId: booking.ticket.eventId,
          description: `Platform commission (${platformFeePercentage}%)`,
          status: TransactionStatus.SUCCESS,
          processedAt: new Date(),
        },
      });

      return paymentTransaction;
    });
  }

  async processHostPayout(
    bookingId: string,
    stripeTransferId: string,
    stripeAccountId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        select: {
          ticket: {
            select: {
              id: true,
              eventId: true,

              event: {
                select: {
                  id: true,
                  title: true,
                  seller: {
                    select: {
                      id: true,
                      stripeAccountId: true,
                      stripeOnboardingComplete: true,
                    },
                  },
                },
              },
            },
          },
          transactions: {
            where: { type: TransactionType.BOOKING_PAYMENT },
          },
        },
      });

      if (!booking || !booking.transactions[0].sellerAmount) {
        throw new BadRequestException('Booking or host amount not found');
      }

      const originalPayment = booking.transactions[0];
      if (!originalPayment) {
        throw new BadRequestException('Original payment transaction not found');
      }

      return tx.transaction.create({
        data: {
          type: TransactionType.SELLER_PAYOUT,
          amount: booking.transactions[0].sellerAmount,
          currency: Currency.USD,
          provider: PaymentProvider.STRIPE_CONNECT,
          payeeId: booking.ticket.event.seller.id,
          bookingId: bookingId,
          eventId: booking.ticket.eventId,
          parentTransactionId: originalPayment.id,
          stripeTransferId,
          stripeAccountId,
          description: `Host payout for ${booking.ticket.event.title}`,
          status: TransactionStatus.SUCCESS,
          processedAt: new Date(),
        },
      });
    });
  }

  // ============= COUPON OPERATIONS =============

  // ============= REFUND OPERATIONS =============

  async processRefund(
    originalTransactionId: string,
    refundAmount: number,
    reason: string,
    stripeRefundId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const originalTransaction = await tx.transaction.findUnique({
        where: { id: originalTransactionId },
        include: {
          payer: true,
          booking: { include: { ticket: true } },
        },
      });

      if (!originalTransaction) {
        throw new NotFoundException('Original transaction not found');
      }

      const refundType =
        originalTransaction.type === TransactionType.BOOKING_PAYMENT
          ? TransactionType.BOOKING_REFUND
          : TransactionType.COUPON_REFUND;

      return tx.transaction.create({
        data: {
          type: refundType,
          amount: new Decimal(-Math.abs(refundAmount)), // Negative for refund
          currency: originalTransaction.currency,
          provider: originalTransaction.provider,
          payeeId: originalTransaction.payerId, // Customer receives refund
          bookingId: originalTransaction.bookingId,
          eventId: originalTransaction.booking?.ticket.eventId,
          parentTransactionId: originalTransactionId,
          stripeChargeId: stripeRefundId,
          description: `Refund: ${reason}`,
          status: TransactionStatus.SUCCESS,
          processedAt: new Date(),
        },
      });
    });
  }

  // ============= QUERY OPERATIONS =============

  async getTransactions(
    filters: TransactionFilters,
    pagination: PaginationOptions = {},
  ) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;

    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {};

    if (filters.userId) {
      where.OR = [{ payerId: filters.userId }, { payeeId: filters.userId }];
    }

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.bookingId) where.bookingId = filters.bookingId;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
          booking: {
            select: {
              id: true,
              ticket: {
                select: {
                  id: true,
                  eventId: true,
                  event: { select: { id: true, title: true } },
                },
              },
            },
          },

          parentTransaction: { select: { id: true, type: true } },
          childTransactions: { select: { id: true, type: true, amount: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionById(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } },
        booking: {
          include: {
            ticket: { select: { id: true, eventId: true } },
          },
        },
        event: { select: { id: true, title: true } },
        parentTransaction: true,
        childTransactions: true,
        approvedBy: { select: { id: true, name: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  // ============= ANALYTICS OPERATIONS =============

  async getTransactionAnalytics(
    filters: TransactionFilters,
  ): Promise<TransactionAnalytics> {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.userId) {
      where.OR = [{ payerId: filters.userId }, { payeeId: filters.userId }];
    }

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [aggregates, byType, byStatus] = await Promise.all([
      this.prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
        _avg: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.groupBy({
        by: ['status'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      totalAmount: Number(aggregates._sum.amount || 0),
      totalCount: aggregates._count,
      averageAmount: Number(aggregates._avg.amount || 0),
      byType: byType.reduce(
        (acc, item) => {
          acc[item.type] = {
            amount: Number(item._sum.amount || 0),
            count: item._count,
          };
          return acc;
        },
        {} as Record<string, { amount: number; count: number }>,
      ),
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = {
            amount: Number(item._sum.amount || 0),
            count: item._count,
          };
          return acc;
        },
        {} as Record<string, { amount: number; count: number }>,
      ),
    };
  }

  async getHostEarnings(hostId: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.TransactionWhereInput = {
      payeeId: hostId,
      type: TransactionType.SELLER_PAYOUT,
      status: TransactionStatus.SUCCESS,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [earnings, transactions] = await Promise.all([
      this.prisma.transaction.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.findMany({
        where,
        include: {
          booking: {
            include: {
              ticket: { select: { id: true, eventId: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10, // Recent transactions
      }),
    ]);

    return {
      totalEarnings: Number(earnings._sum.amount || 0),
      totalPayouts: earnings._count,
      recentTransactions: transactions,
    };
  }

  async getPlatformRevenue(startDate?: Date, endDate?: Date) {
    const where: Prisma.TransactionWhereInput = {
      type: TransactionType.ADMIN_COMMISSION,
      status: TransactionStatus.SUCCESS,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });
  }

  // ============= ADMIN OPERATIONS =============

  async approveTransaction(transactionId: string, adminId: string) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.SUCCESS,
        approvedById: adminId,
        approvedAt: new Date(),
      },
    });
  }

  async rejectTransaction(
    transactionId: string,
    adminId: string,
    reason: string,
  ) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.REJECTED,
        approvedById: adminId,
        approvedAt: new Date(),
        notes: reason,
      },
    });
  }

  //get host transactions with pagination
  async getHostTransactions(userId: string, query: TransactionQuery) {
    const parseQuery = transactionQuerySchema.safeParse(query);
    if (!parseQuery.success) {
      throw new BadRequestException(parseQuery.error.errors);
    }
    const {
      search,
      limit = '1',
      page = '1',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateRange = 'last7days',
    } = parseQuery.data;
    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;
    const where: Prisma.TransactionWhereInput = {
      payeeId: userId,
    };
    if (search) {
      where.OR = [
        { payer: { name: { contains: search } } },
        { payee: { name: { contains: search } } },
      ];
    }
    if (status) where.status = status;

    const range = {
      last7days: 7,
      last30days: 30,
      last3months: 90,
      last6months: 180,
      lastyear: 365,
    };
    if (dateRange) {
      where.createdAt = {
        gte: new Date(
          new Date().setDate(new Date().getDate() - range[dateRange]),
        ),
      };
    }
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          booking: {
            select: {
              id: true,
              ticket: { select: { id: true, eventId: true } },
            },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limitNum),
        next: skip + limitNum < total,
        prev: pageNum > 1,
        dateRange,
      },
    };
  }

  //get user payments
  async getUserPayments(userId: string, query: TransactionQuery) {
    const {
      search,
      limit = '10',
      page = '1',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      from,
      to,
    } = transactionQuerySchema.parse(query);

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.TransactionWhereInput = {
      payerId: userId,
      type: TransactionType.BOOKING_PAYMENT,
    };

    // Date range on createdAt
    if (from || to) {
      const createdAt: any = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime()))
          createdAt.gte = new Date(d.setHours(0, 0, 0, 0));
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime()))
          createdAt.lte = new Date(d.setHours(23, 59, 59, 999));
      }
      if (Object.keys(createdAt).length > 0) {
        (where as any).createdAt = createdAt;
      }
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      (where as any).OR = [
        { id: { equals: s } },
        { externalTxnId: { contains: s, mode: 'insensitive' } } as any,
        { payer: { name: { contains: s, mode: 'insensitive' } } } as any,
        { payer: { email: { contains: s, mode: 'insensitive' } } } as any,
        { payee: { name: { contains: s, mode: 'insensitive' } } } as any,
        { payee: { email: { contains: s, mode: 'insensitive' } } } as any,
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          amount: true,
          status: true,
          processedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        next: skip + limitNum < total,
        prev: pageNum > 1,
        from,
        to,
      },
    };
  }
  async getSellerPayouts(userId: string, query: TransactionQuery) {
    const {
      search,
      limit = '10',
      page = '1',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      from,
      to,
    } = transactionQuerySchema.parse(query);

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.TransactionWhereInput = {
      payeeId: userId,
      type: TransactionType.SELLER_PAYOUT,
    };

    // Date range on createdAt
    if (from || to) {
      const createdAt: any = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime()))
          createdAt.gte = new Date(d.setHours(0, 0, 0, 0));
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime()))
          createdAt.lte = new Date(d.setHours(23, 59, 59, 999));
      }
      if (Object.keys(createdAt).length > 0) {
        (where as any).createdAt = createdAt;
      }
    }

    if (search && typeof search === 'string' && search.trim().length > 0) {
      const s = search.trim();
      (where as any).OR = [
        { id: { equals: s } },
        { externalTxnId: { contains: s, mode: 'insensitive' } } as any,
        { payer: { name: { contains: s, mode: 'insensitive' } } } as any,
        { payer: { email: { contains: s, mode: 'insensitive' } } } as any,
        { payee: { name: { contains: s, mode: 'insensitive' } } } as any,
        { payee: { email: { contains: s, mode: 'insensitive' } } } as any,
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy]: sortOrder },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          booking: {
            select: {
              id: true,
              ticket: {
                select: {
                  id: true,
                  eventId: true,
                  event: { select: { id: true, title: true } },
                },
              },
            },
          },
          parentTransaction: { select: { id: true, type: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        next: skip + limitNum < total,
        prev: pageNum > 1,
        from,
        to,
      },
    };
  }

  async getInvoice(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        currency: true,
        processedAt: true,
        createdAt: true,
        payer: { select: { id: true, name: true, email: true } },
        payee: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true } },
        booking: {
          select: {
            id: true,
            price: true,
            discount: true,
            total: true,
            paymentMethod: true,
            status: true,
          },
        },
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return {
      status: true,
      data: transaction,
    };
  }

  async getAllTransactions(query: any) {
    const parsed = adminTransactionQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.errors);
    }

    const {
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
      search,
      type,
      status,
      currency,
      provider,
      payerId,
      payeeId,
      bookingId,
      parentTransactionId,
      externalTxnId,
      stripePaymentIntent,
      stripeTransferId,
      stripeAccountId,
      stripeChargeId,
      from,
      to,
    } = parsed.data as any;

    const take = Number(limit) > 0 ? Number(limit) : 20;
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const skip = (pageNum - 1) * take;

    const where: Prisma.TransactionWhereInput = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (currency) where.currency = currency;
    if (provider) where.provider = provider;
    if (payerId) where.payerId = payerId;
    if (payeeId) where.payeeId = payeeId;
    if (bookingId) where.bookingId = bookingId;

    if (parentTransactionId) where.parentTransactionId = parentTransactionId;
    if (externalTxnId)
      where.externalTxnId = {
        contains: externalTxnId,
        mode: 'insensitive',
      } as any;
    if (stripePaymentIntent)
      where.stripePaymentIntent = {
        contains: stripePaymentIntent,
        mode: 'insensitive',
      } as any;
    if (stripeTransferId)
      where.stripeTransferId = {
        contains: stripeTransferId,
        mode: 'insensitive',
      } as any;
    if (stripeAccountId)
      where.stripeAccountId = {
        contains: stripeAccountId,
        mode: 'insensitive',
      } as any;
    if (stripeChargeId)
      where.stripeChargeId = {
        contains: stripeChargeId,
        mode: 'insensitive',
      } as any;

    // Date range on createdAt
    if (from || to) {
      const createdAt: any = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime()))
          createdAt.gte = new Date(d.setHours(0, 0, 0, 0));
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime()))
          createdAt.lte = new Date(d.setHours(23, 59, 59, 999));
      }
      if (Object.keys(createdAt).length > 0) {
        (where as any).createdAt = createdAt;
      }
    }

    // Search handling: key-specific (key=value) or broad search
    if (search && typeof search === 'string') {
      const s = search.trim();
      if (s.length > 0) {
        const eqIdx = s.indexOf('=');
        if (eqIdx > 0) {
          const key = s.slice(0, eqIdx).trim();
          const val = s.slice(eqIdx + 1).trim();
          if (val) {
            switch (key) {
              case 'id':
                (where as any).id = { equals: val };
                break;
              case 'payerEmail':
                (where as any).payer = {
                  email: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'payerName':
                (where as any).payer = {
                  name: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'payeeEmail':
                (where as any).payee = {
                  email: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'payeeName':
                (where as any).payee = {
                  name: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'experienceName':
                (where as any).experience = {
                  name: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'couponCode':
                (where as any).coupon = {
                  code: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'externalTxnId':
                (where as any).externalTxnId = {
                  contains: val,
                  mode: 'insensitive',
                } as any;
                break;
              case 'stripePaymentIntent':
                (where as any).stripePaymentIntent = {
                  contains: val,
                  mode: 'insensitive',
                } as any;
                break;
              case 'stripeChargeId':
                (where as any).stripeChargeId = {
                  contains: val,
                  mode: 'insensitive',
                } as any;
                break;
              case 'stripeTransferId':
                (where as any).stripeTransferId = {
                  contains: val,
                  mode: 'insensitive',
                } as any;
                break;
              case 'payerId':
                (where as any).payerId = { equals: val };
                break;
              case 'payeeId':
                (where as any).payeeId = { equals: val };
                break;
              case 'bookingId':
                (where as any).bookingId = { equals: val };
                break;
              case 'couponId':
                (where as any).couponId = { equals: val };
                break;
              case 'experienceId':
                (where as any).experienceId = { equals: val };
                break;
              default:
                (where as any).OR = [
                  { id: { equals: s } },
                  { externalTxnId: { contains: s, mode: 'insensitive' } },
                  { stripePaymentIntent: { contains: s, mode: 'insensitive' } },
                  { stripeChargeId: { contains: s, mode: 'insensitive' } },
                  { stripeTransferId: { contains: s, mode: 'insensitive' } },
                  { payer: { name: { contains: s, mode: 'insensitive' } } },
                  { payer: { email: { contains: s, mode: 'insensitive' } } },
                  { payee: { name: { contains: s, mode: 'insensitive' } } },
                  { payee: { email: { contains: s, mode: 'insensitive' } } },
                  {
                    experience: { name: { contains: s, mode: 'insensitive' } },
                  },
                  { coupon: { code: { contains: s, mode: 'insensitive' } } },
                ] as any;
            }
          }
        } else {
          (where as any).OR = [
            { id: { equals: s } },
            { externalTxnId: { contains: s, mode: 'insensitive' } },
            { stripePaymentIntent: { contains: s, mode: 'insensitive' } },
            { stripeChargeId: { contains: s, mode: 'insensitive' } },
            { stripeTransferId: { contains: s, mode: 'insensitive' } },
            { payer: { name: { contains: s, mode: 'insensitive' } } },
            { payer: { email: { contains: s, mode: 'insensitive' } } },
            { payee: { name: { contains: s, mode: 'insensitive' } } },
            { payee: { email: { contains: s, mode: 'insensitive' } } },
            { experience: { name: { contains: s, mode: 'insensitive' } } },
            { coupon: { code: { contains: s, mode: 'insensitive' } } },
          ] as any;
        }
      }
    }

    const orderBy: Prisma.TransactionOrderByWithRelationInput = {
      [sort as 'createdAt' | 'amount' | 'processedAt']: order as 'asc' | 'desc',
    } as any;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          payer: { select: { id: true, name: true, email: true } },
          payee: { select: { id: true, name: true, email: true } },
          booking: {
            select: {
              id: true,
              ticket: { select: { id: true, eventId: true } },
            },
          },
          event: { select: { id: true, title: true } },
          parentTransaction: { select: { id: true, type: true } },
          childTransactions: { select: { id: true, type: true, amount: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      status: true,
      data,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}
