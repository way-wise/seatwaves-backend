import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  BookingStatus,
  Currency,
  PaymentProvider,
  Prisma,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { NotificationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from 'src/prisma/prisma.service';
import { createBookingDto } from './dto/booking.dto';
import { queryBookingSchema } from './dto/query.dto';
import { HostBookingQuerySchema } from './dto/queryCursor.dto';
import { NotificationService } from 'src/notification/notification.service';
import { emailQueue } from 'src/queues/email.queue';
import { EmailService } from 'src/email/email.service';
import { StripeService } from 'src/stripe/stripe.service';
import { adminQuerySchema } from './dto/admin.query.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}
  private readonly logger = new Logger(BookingService.name);
  // ✅ Guest - Create a booking with concurrency protection
  async create(data: createBookingDto, userId: string) {
    return { status: true, message: 'Booking created successfully' };
  }

  // ✅ Guest - View own bookings
  async findByGuest(userId: string, query: any) {
    if (!userId) throw new NotFoundException('This user does not exist');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('This user does not exist');

    const parseQuery = queryBookingSchema.safeParse(query);

    //TODO: add pagination and filters
    //TODO: add sorting

    if (!parseQuery.success) {
      throw new NotAcceptableException(parseQuery.error.errors);
    }

    const {
      search,
      status,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = parseQuery.data;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      deletedAt: null,
      userId,
    };

    if (search) {
      where.OR = [
        { id: { equals: search } },
        { experience: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        take: parseInt(limit),
        skip,
        orderBy: { [sortBy as string]: sortOrder },
        select: {
          id: true,
          total: true,
          status: true,

          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.booking.count({
        where,
      }),
    ]);
    const hasNext = skip + parseInt(limit) < total;
    const hasPrev = skip > 0;
    return {
      status: true,
      data: bookings,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext,
      hasPrev,
    };
  }

  // ✅ Host - View bookings for own experiences
  async findByHost(hostId: string, query: any) {
    const user = await this.prisma.user.findFirst({ where: { id: hostId } });
    if (!user) throw new NotFoundException('This user does not exist');

    /*
    TODO: filter by date, experience name and status
    TODO: Add pagination

    */
    const parseQuery = queryBookingSchema.safeParse(query);

    if (!parseQuery.success) {
      throw new NotAcceptableException(parseQuery.error.errors);
    }

    const {
      search,
      status,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      from,
      to,
    } = parseQuery.data;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      deletedAt: null,
      experience: {
        userId: hostId,
      },
    };

    if (search) {
      where.OR = [
        { id: { equals: search } },
        { experience: { name: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

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

    //TODO: CHECK ROLE

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        take: parseInt(limit),
        skip,
        orderBy: { [sortBy as string]: sortOrder },
        select: {
          id: true,
          total: true,
          status: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, avatar: true, email: true } },
        },
      }),
      this.prisma.booking.count({
        where,
      }),
    ]);

    const hasNext = skip + parseInt(limit) < total;
    const hasPrev = skip > 0;
    return {
      status: true,
      data: bookings,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext,
      hasPrev,
    };
  }

  // findHostAppBookings with cursor pagination
  async findHostAppBookings(userId: string, query: any) {
    const parseQuery = HostBookingQuerySchema.safeParse(query);

    if (!parseQuery.success) {
      throw new NotAcceptableException(parseQuery.error.errors);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('This user does not exist');

    const {
      cursor,
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = parseQuery.data;

    const skip = cursor ? 1 : 0;

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          total: true,
          status: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, avatar: true, email: true } },
        },
        skip,
        take: parseInt(limit),
        orderBy: { [sortBy as string]: sortOrder },
        cursor: cursor ? { id: cursor } : undefined,
      }),
      this.prisma.booking.count({
        where: {
          deletedAt: null,
        },
      }),
    ]);

    if (!bookings) throw new NotFoundException('Bookings not found');

    return {
      status: true,
      data: bookings,
      total,
      cursor: bookings[bookings.length - 1]?.id,
    };
  }

  // ✅ Admin - View all bookings
  async findAll(query: any) {
    const { page = 1, limit = 10, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = { deletedAt: null };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = (await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true } },

          transactions: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ])) as [any[], number];

    return {
      status: true,
      data,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  // ✅ Guest - View single booking
  async findOneForGuest(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        transactions: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    // if (!booking || booking.userId !== userId) throw new ForbiddenException();
    return {
      status: true,
      data: booking,
    };
  }

  // ✅ Update booking (admin/host only)
  async updateStatus(bookingId: string, status: BookingStatus) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new ForbiddenException(
        `A booking that is ${booking.status} cannot be updated.`,
      );
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
    return {
      status: true,
      data: updatedBooking,
      message: 'Status updated successfully',
    };
  }

  //callback url
  async success(query: any) {
    const { session_id } = query || {};
    if (!session_id || typeof session_id !== 'string') {
      throw new BadRequestException('session_id is required');
    }

    // Retrieve Checkout Session to map to its payment_intent
    const session =
      await this.stripeService.retrieveCheckoutSession(session_id);

    if (session.payment_status !== 'paid') {
      throw new BadRequestException('Payment not processed');
    }

    // Find the related transaction using the payment intent id
    const transaction = await this.prisma.transaction.findFirst({
      where: { externalTxnId: session.id },
      select: { id: true, bookingId: true },
    });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction not found for this checkout session',
      );
    }

    //update transaction and booking status
    // await this.prisma.transaction.update({
    //   where: { id: transaction.id },
    //   data: {
    //     status: TransactionStatus.SUCCESS,
    //     processedAt: new Date(),
    //     booking: {
    //       update: {
    //         status: BookingStatus.CONFIRMED,
    //       },
    //     },
    //   },
    // });

    const bookingDetails = await this.prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        booking: {},
      },
    });

    return {
      status: true,
      data: bookingDetails,
      message: 'Booking completed successfully',
    };
  }

  // ✅ Cancel (soft delete) booking (guest)
  async cancelByGuest(bookingId: string, userId: string) {
    // Load booking with minimal but necessary relations
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        transactions: {
          where: { type: 'BOOKING_PAYMENT' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            amount: true,
            status: true,
            stripePaymentIntent: true,
          },
        },
      },
    });

    if (!booking || booking.userId !== userId)
      throw new ForbiddenException(
        'You are not authorized to cancel this booking',
      );

    // Enforce cancellation window based on event start time
    const now = new Date();
    const cutoffHours = Number(
      this.configService.get('CANCELLATION_CUTOFF_HOURS') ?? 24,
    );

    if (booking.status === 'CANCELLED')
      throw new ForbiddenException('This booking is already cancelled');

    if (booking.status === 'COMPLETED')
      throw new ForbiddenException('This booking is already completed');

    // Ensure we have a successful payment transaction to refund
    const originalTxn = booking.transactions[0];
    if (!originalTxn || !originalTxn.stripePaymentIntent) {
      throw new BadRequestException('No payment found to refund');
    }
    // Optional: ensure payment was successful before proceeding
    if (originalTxn.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Payment is not captured or already refunded; cannot process refund',
      );
    }

    // Compute refund amount: total paid minus fixed cancellationFee (if any)
    const originalPaid = Number(originalTxn.amount || 0);
    const fee = 0;

    const refundAmount = Math.max(originalPaid - fee, 0);

    // Idempotency: if a refund transaction already exists for this booking's original transaction, skip creating another
    const existingRefund = await this.prisma.transaction.findFirst({
      where: {
        parentTransactionId: originalTxn.id,
        type: TransactionType.BOOKING_REFUND,
        status: TransactionStatus.SUCCESS,
      },
      select: { id: true, amount: true, externalTxnId: true },
    });

    // Process refund if needed and not already refunded
    let refundResult: any = null;
    if (refundAmount > 0 && !existingRefund) {
      refundResult = await this.stripeService.processRefund(
        originalTxn.stripePaymentIntent,
        refundAmount,
        'guest_cancellation',
      );
    }

    // Batch booking + transaction status updates atomically
    const [cancelledBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      }),
      this.prisma.transaction.update({
        where: { id: originalTxn.id },
        data: {
          status:
            Number(existingRefund?.amount || 0) + Number(refundAmount || 0) >=
            Number(originalTxn.amount || 0)
              ? TransactionStatus.FULLY_REFUNDED
              : Number(existingRefund?.amount || 0) +
                    Number(refundAmount || 0) >
                  0
                ? TransactionStatus.PARTIALLY_REFUNDED
                : originalTxn.status,
          updatedAt: new Date(),
        },
      }),
    ]);

    // Queue in-app notifications (non-blocking)
    try {
      // Notify guest
      await this.notificationService.createAndQueueNotification(
        booking.userId,
        {
          type: NotificationType.BOOKING,
          title: 'Booking Cancelled',
          message: `Your booking ${bookingId} was cancelled. Refunded: $${refundAmount.toFixed(2)}${fee ? ` (Cancellation fee: $${fee})` : ''}.`,
          link: `/users/booking/${bookingId}`,
        },
      );

      // Notify host
      //TODO: get actual host id
      const sellerId = 'dddddddddddddd';
      if (sellerId) {
        await this.notificationService.createAndQueueNotification(sellerId, {
          type: NotificationType.BOOKING,
          title: 'Booking Cancelled by Guest',
          message: `A booking (${bookingId}) for your experience was cancelled by the guest.`,
          link: `/host/bookings`,
        });
      }
    } catch (e) {
      this.logger.warn(
        `Failed to queue notifications for booking ${bookingId}: ${e?.message}`,
      );
    }

    // Send email to guest (non-blocking)
    try {
      const subject = 'Your booking has been cancelled';
      const bookingLink = `${this.configService.get('APP_CLIENT_URL')}/bookings/${bookingId}`;
      const refundLine =
        refundAmount > 0
          ? `Refunded: $${refundAmount.toFixed(2)}${fee ? ` (Cancellation fee: $${fee})` : ''}.`
          : 'No refund was due based on the cancellation policy.';
      const text = `Hi,

Your booking (${bookingId}) has been cancelled.
${refundLine}

View details: ${bookingLink}

Thank you.`;
      const html = `<p>Hi,</p>
<p>Your booking (<strong>${bookingId}</strong>) has been cancelled.</p>
<p>${refundLine}</p>
<p><a href="${bookingLink}">View booking details</a></p>
<p>Thank you.</p>`;

      await this.emailService.sendEmailToUser(booking.userId, {
        subject,
        text,
        html,
      } as any);
    } catch (e) {
      this.logger.warn(
        `Failed to send cancellation email for booking ${bookingId}: ${e?.message}`,
      );
    }

    return {
      status: true,
      data: {
        booking: cancelledBooking,
        refund: {
          originalPaid,
          cancellationFee: fee,
          refundedAmount: refundAmount,
          stripeRefundId: refundResult?.refund?.id,
        },
      },
      message: 'Booking cancelled successfully',
    };
  }

  async adminGetAllBookings(query: any) {
    const parsedQuery = adminQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(parsedQuery.error.message);
    }

    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      search,
      status,
      from,
      to,
    } = parsedQuery.data as any;

    const take = Number(limit) > 0 ? Number(limit) : 10;
    const pageNum = Number(page) > 0 ? Number(page) : 1;
    const skip = (pageNum - 1) * take;

    const where: Prisma.BookingWhereInput = { deletedAt: null };

    if (status) where.status = status as any;

    // Search handling: supports either key-specific (e.g., 'experienceId=...') or broad search
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
                where.id = { equals: val } as any;
                break;

              case 'userEmail':
                where.user = {
                  ...(where.user as any),
                  email: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              case 'userName':
                where.user = {
                  ...(where.user as any),
                  name: { contains: val, mode: 'insensitive' },
                } as any;
                break;
              default:
                // Fallback to broad OR if unknown key
                where.OR = [
                  { id: { equals: s } },
                  { user: { name: { contains: s, mode: 'insensitive' } } },
                  { user: { email: { contains: s, mode: 'insensitive' } } },
                ];
            }
          }
        } else {
          // Broad search across booking id, user name/email, experience name
          where.OR = [
            { id: { equals: s } },
            { user: { name: { contains: s, mode: 'insensitive' } } },
            { user: { email: { contains: s, mode: 'insensitive' } } },
          ];
        }
      }
    }

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

    // Sorting (whitelisted by DTO)
    const orderBy: Prisma.BookingOrderByWithRelationInput = {
      [sort as 'createdAt' | 'startDate' | 'total']: order as 'asc' | 'desc',
    } as any;

    const [bookings, total] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          status: true,
          price: true,
          discount: true,
          vat: true,
          tax: true,
          total: true,
          user: { select: { id: true, name: true, email: true, avatar: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    const totalPages = Math.ceil(total / take);

    return {
      status: true,
      data: bookings,
      pagination: {
        page: pageNum,
        limit: take,
        totalPages,
        total,
      },
    };
  }

  // Admin - Detailed booking view
  async adminGetBookingDetails(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },

        transactions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            status: true,
            amount: true,
            currency: true,
            provider: true,
            createdAt: true,
            processedAt: true,
            externalTxnId: true,
            stripePaymentIntent: true,
            stripeChargeId: true,
            stripeTransferId: true,
            platformFee: true,
            sellerAmount: true,
            payer: { select: { id: true, name: true, email: true } },
            payee: { select: { id: true, name: true, email: true } },
          },
        },
        rooms: { select: { id: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    return {
      status: true,
      data: booking,
    };
  }
}
