import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotAcceptableException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  BookingStatus,
  Currency,
  OtpType,
  PaymentProvider,
  Prisma,
  TransactionStatus,
  TransactionType,
  AdminBalanceType,
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
import {
  generateBookingOTPEmailText,
  generateBookingOTPEmailHTML,
  generateBookingCancellationEmailText,
  generateBookingCancellationEmailHTML,
  generateBookingVerifiedBuyerEmailText,
  generateBookingVerifiedBuyerEmailHTML,
  generateBookingVerifiedSellerEmailText,
  generateBookingVerifiedSellerEmailHTML,
} from 'src/lib/email-template';
import { StripeService } from 'src/stripe/stripe.service';
import { adminQuerySchema } from './dto/admin.query.dto';

@Injectable()
export class BookingService {
  private readonly platformFeePercentage: number;
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    this.platformFeePercentage = this.configService.get<number>(
      'PLATFORM_FEE_PERCENTAGE',
      5, // Default 5%
    );
  }
  private readonly logger = new Logger(BookingService.name);
  // ✅ Guest - Create a booking with concurrency protection
  async create(data: createBookingDto, userId: string) {
    return { status: true, message: 'Booking created successfully' };
  }

  async upcomingBooking(userId: string) {
    if (!userId) throw new NotFoundException('This user does not exist');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('This user does not exist');

    const bookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.SHIPPED] },
      },

      include: {
        ticket: {
          select: {
            id: true,
            seatDetails: true,
            note: true,
            seller: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
            event: {
              select: {
                title: true,
                startTime: true,
                endTime: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return { status: true, data: bookings };
  }

  // ✅ Guest - View own bookings
  async findByGuest(userId: string, query: any) {
    if (!userId) throw new NotFoundException('This user does not exist');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('This user does not exist');

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
    } = parseQuery.data;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      deletedAt: null,
      userId,
    };

    if (search) {
      where.OR = [
        { id: { equals: search } },
        {
          ticket: {
            event: { title: { contains: search, mode: 'insensitive' } },
          },
        },
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
          price: true,
          discount: true,
          total: true,
          status: true,
          createdAt: true,
          ticket: {
            select: {
              event: {
                select: {
                  id: true,
                  title: true,
                },
              },
              seller: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.booking.count({
        where,
      }),
    ]);

    return {
      status: true,
      data: bookings,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async invoice(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id, userId },
      select: {
        id: true,
        userId: true,
        price: true,
        discount: true,
        vat: true,
        tax: true,
        total: true,
        deliveryType: true,
        paymentMethod: true,
        pickupAddress: true,
        phone: true,
        email: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            processedAt: true,
            createdAt: true,
          },
        },
        ticket: {
          select: {
            id: true,
            seatDetails: true,
            ticketId: true,
            ticketType: true,
            price: true,
            event: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                venue: true,
                duration: true,
                city: true,
                address: true,
                country: true,
                timezone: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('This booking does not exist');
    if (booking.userId !== userId) throw new UnauthorizedException();

    return { status: true, data: booking };
  }

  // ✅ Host - View bookings for own experiences
  async findByHost(hostId: string, query: any) {
    const user = await this.prisma.user.findFirst({ where: { id: hostId } });
    if (!user) throw new NotFoundException('This user does not exist');

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
      ticket: {
        sellerId: hostId,
      },
    };

    if (search) {
      where.OR = [
        { id: { equals: search } },
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
          pickupAddress: true,
          phone: true,
          email: true,
          deliveryType: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, avatar: true, email: true } },
        },
      }),
      this.prisma.booking.count({
        where,
      }),
    ]);

    return {
      status: true,
      data: bookings,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  }

  async updateSellerStatus(
    id: string,
    status: BookingStatus,
    sellerId: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        ticket: {
          select: {
            sellerId: true,
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('This booking does not exist');

    if (sellerId !== booking.ticket.sellerId) {
      throw new UnauthorizedException(
        'You are not allowed to update this booking',
      );
    }

    await this.prisma.booking.update({
      where: { id },
      data: { status },
    });
    return { status: true, message: 'Booking status updated successfully' };
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
      booking.status === BookingStatus.DELIVERED
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
        ticket: {
          select: {
            sellerId: true,
          },
        },
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

    if (booking.status === 'DELIVERED')
      throw new ForbiddenException('This booking is already delivered');

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
      const sellerId = booking.ticket.sellerId;
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
      const bookingLink = `${this.configService.get('APP_CLIENT_URL')}/bookings/${bookingId}`;

      await this.emailService.sendEmailToUser(booking.userId, {
        subject: 'Your booking has been cancelled',
        text: generateBookingCancellationEmailText({
          bookingId,
          refundAmount,
          cancellationFee: fee,
          bookingLink,
        }),
        html: generateBookingCancellationEmailHTML({
          bookingId,
          refundAmount,
          cancellationFee: fee,
          bookingLink,
        }),
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
        ticket: {
          select: {
            id: true,
            seatDetails: true,
            ticketId: true,
            eventId: true,
            price: true,
            discount: true,
            discountType: true,
            description: true,
            note: true,
            metadata: true,
            isBooked: true,
            createdAt: true,
            updatedAt: true,
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        transactions: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    return {
      status: true,
      data: booking,
    };
  }

  // Generate booking code
  async generateBookingCode(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    //send verification email
    // Generate OTP

    // Clear existing OTPs for this user
    await this.prisma.userOtp.deleteMany({
      where: { email: booking.user.email, type: OtpType.BOOKING },
    });

    const otp = this.generateMixedOTP(6);

    // Save OTP
    const otpData = await this.prisma.userOtp.create({
      data: {
        email: booking.user.email,
        type: OtpType.BOOKING,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      },
    });

    await this.emailService.sendOTPEmail({
      to: booking.user.email,
      subject: 'Booking Verification Code',
      text: generateBookingOTPEmailText({
        otp: otpData.otp,
        bookingId: booking.id,
      }),
      html: generateBookingOTPEmailHTML({
        otp: otpData.otp,
        bookingId: booking.id,
      }),
    });

    //Send Notification
    await this.notificationService.sendNotification(booking.user.id, {
      title: 'Booking OTP',
      message: `Your OTP for booking is ${otpData.otp}. This OTP is valid for 10 minutes. Do not share this OTP with anyone.`,
      type: NotificationType.BOOKING,
      data: {
        bookingId: booking.id,
        otp: otpData.otp,
      },
    });

    return {
      status: true,
      message: 'Booking code generated successfully',
      data: booking,
    };
  }

  async verifyBookingCode(bookingId: string, otp: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ticket: {
          select: {
            sellerId: true,
            seller: {
              select: {
                id: true,
                stripeAccountId: true,
                stripeOnboardingComplete: true,
                name: true,
                email: true,
              },
            },
            eventId: true,
            event: {
              select: { id: true, title: true },
            },
          },
        },
        transactions: {
          where: { type: TransactionType.BOOKING_PAYMENT },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Validate OTP for this booking's user
    const otpData = await this.prisma.userOtp.findFirst({
      where: { email: booking.user.email, type: OtpType.BOOKING },
    });
    if (!otpData) throw new NotFoundException('OTP not found');
    if (otpData.otp !== otp) throw new BadRequestException('Invalid OTP');
    if (otpData.expiresAt && otpData.expiresAt < new Date())
      throw new BadRequestException('OTP expired');

    // Use the latest payment transaction for amounts; keep it simple
    const paymentTxn = booking.transactions[0];
    if (!paymentTxn) {
      throw new BadRequestException('No payment transaction found for booking');
    }

    // 1) Create Stripe transfer first
    const sellerAccountId = booking.ticket.seller?.stripeAccountId;
    if (!sellerAccountId) {
      throw new BadRequestException('Seller Stripe account not found');
    }
    const sellerAmount = Number(paymentTxn.sellerAmount || 0);
    let payoutInitiated = false;
    let transferId: string | undefined;
    if (sellerAmount > 0) {
      const transfer = await this.stripeService.createTransferRaw({
        amount: sellerAmount,
        currency: 'usd',
        destination: sellerAccountId,
        description: 'Seller payout for delivered booking',
        sourceTransaction: booking.id,
      });
      transferId = transfer.id;
      payoutInitiated = true;
    }

    // 2) DB updates inside a single transaction. On failure, reverse the transfer
    try {
      await this.prisma.$transaction(async (tx) => {
        // Mark delivered if not already
        if (booking.status !== BookingStatus.DELIVERED) {
          await tx.booking.update({
            where: { id: bookingId },
            data: { status: BookingStatus.DELIVERED, updatedAt: new Date() },
          });
        }

        // Credit platform fee to AdminBalance, once per booking
        const existingCredit = await tx.adminBalance.findFirst({
          where: { reference: booking.id, type: AdminBalanceType.CREDIT },
        });
        const platformFee = Number(paymentTxn.platformFee || 0);
        if (!existingCredit && platformFee > 0) {
          await tx.adminBalance.create({
            data: {
              amount: platformFee,
              reference: booking.id,
              type: AdminBalanceType.CREDIT,
              metadata: {
                reason: 'BOOKING_PLATFORM_FEE',
                bookingId: booking.id,
                transactionId: paymentTxn.id,
              } as any,
            },
          });
        }

        // Invalidate OTP(s) for this email/type
        await tx.userOtp.deleteMany({
          where: { email: booking.user.email, type: OtpType.BOOKING },
        });

        // Create SELLER_PAYOUT transaction tied to the transfer
        if (payoutInitiated && transferId) {
          await tx.transaction.create({
            data: {
              type: TransactionType.SELLER_PAYOUT,
              amount: sellerAmount,
              currency: Currency.USD,
              provider: PaymentProvider.STRIPE_CONNECT,
              payeeId: booking.ticket.seller.id,
              bookingId: bookingId,
              eventId: booking.ticket.eventId,
              parentTransactionId: paymentTxn.id,
              stripeTransferId: transferId,
              stripeAccountId: sellerAccountId,
              description: `Host payout for ${booking.ticket.event.title}`,
              status: TransactionStatus.SUCCESS,
              processedAt: new Date(),
            },
          });
        }
      });
    } catch (err) {
      // Reverse the transfer if DB transaction failed
      if (payoutInitiated && transferId) {
        try {
          await this.stripeService.reverseTransfer(transferId, sellerAmount);
        } catch (reversalErr) {
          this.logger.error(
            `Failed to reverse transfer ${transferId} after DB failure: ${
              (reversalErr as any)?.message
            }`,
          );
        }
      }
      throw err;
    }

    // Notifications (non-blocking)
    this.notificationService.sendNotification(booking.user.id, {
      title: 'Booking Verified',
      message: 'Your booking has been verified successfully.',
      type: NotificationType.BOOKING,
      data: { bookingId: booking.id },
    });

    this.notificationService.sendNotification(booking.ticket.sellerId, {
      title: 'Booking Verified',
      message: payoutInitiated
        ? 'A payout has been initiated for your booking.'
        : 'No payout amount to transfer for this booking.',
      type: NotificationType.BOOKING,
      data: { bookingId: booking.id },
    });

    // Emails (non-blocking)
    this.emailService.sendEmailToUser(booking.user.id, {
      subject: 'Booking Verified Successfully',
      text: generateBookingVerifiedBuyerEmailText({
        bookingId: booking.id,
        ticketTitle: booking.ticket?.event?.title,
      }),
      html: generateBookingVerifiedBuyerEmailHTML({
        bookingId: booking.id,
        ticketTitle: booking.ticket?.event?.title,
      }),
    });

    this.emailService.sendEmailToUser(booking.ticket.sellerId, {
      subject: 'Booking Verified - Payout Initiated',
      text: generateBookingVerifiedSellerEmailText({
        bookingId: booking.id,
        payoutAmount: payoutInitiated ? sellerAmount : undefined,
        ticketTitle: booking.ticket?.event?.title,
      }),
      html: generateBookingVerifiedSellerEmailHTML({
        bookingId: booking.id,
        payoutAmount: payoutInitiated ? sellerAmount : undefined,
        ticketTitle: booking.ticket?.event?.title,
      }),
    });

    return {
      status: true,
      data: { bookingId: booking.id, payoutInitiated },
      message: 'Booking verified successfully',
    };
  }

  private generateMixedOTP(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  }
}
