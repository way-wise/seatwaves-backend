import { Injectable } from '@nestjs/common';
import {
  endOfDay,
  endOfYear,
  startOfDay,
  startOfYear,
  addDays,
  format,
  isBefore,
  differenceInMinutes,
} from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DashboardQueryDto,
  DashboardQuerySchema,
} from './dto/dashboard.query.dto';
import { AdminDashboardQuerySchema } from './dto/admin.dashboard.query.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(userId: string, query: DashboardQueryDto) {
    const parsedQuery = DashboardQuerySchema.parse(query);
    const { duration = '7d' } = parsedQuery;

    // Calculate date ranges based on duration
    const { startDate, endDate } = this.getDateRange(duration);

    const [
      upcomingGuests,
      newBookings,
      unreadMessages,
      pendingReviews,
      earnings,
      recentBookings,
      activeConversations,
      lastThreePendingReviews,
      totalRevenue,
      completedBookings,
      cancelledBookings,
      averageRating,
    ] = await Promise.all([
      // Upcoming guests (confirmed bookings for this seller's events within event time range)
      this.prisma.booking.count({
        where: {
          status: 'CONFIRMED',
          seat: {
            event: {
              sellerId: userId,
              startTime: { gte: startDate, lte: endDate },
            },
          },
        },
      }),

      // New bookings created in the selected period
      this.prisma.booking.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          seat: { event: { sellerId: userId } },
        },
      }),

      // Unread messages in the selected period
      this.prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false,
          sentAt: { gte: startDate, lte: endDate },
        },
      }),

      // Pending reviews in the selected period
      this.prisma.review.count({
        where: {
          revieweeId: userId,
          status: 'PENDING',
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Earnings by month (only for this user)
      this.getEarningsByMonth(userId),

      // Latest 5 bookings for this seller's events
      this.prisma.booking.findMany({
        where: { seat: { event: { sellerId: userId } } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, avatar: true } },
          seat: {
            select: {
              seatId: true,
              event: {
                select: { id: true, title: true, startTime: true, image: true },
              },
            },
          },
        },
      }),

      // Last 5 conversations
      this.prisma.messageRoom.findMany({
        where: { receiverId: userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { name: true, avatar: true } },
          receiver: { select: { name: true, avatar: true } },
          messages: {
            orderBy: { sentAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              sentAt: true,
              isRead: true,
            },
          },
        },
      }),

      // Last 3 pending reviews about this seller
      this.prisma.review.findMany({
        where: { revieweeId: userId, status: 'PENDING' },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { id: true, title: true } },
          reviewer: { select: { name: true, avatar: true } },
        },
      }),

      // Total revenue in the selected period based on completed bookings on seller's events
      this.prisma.booking.aggregate({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startDate, lte: endDate },
          seat: { event: { sellerId: userId } },
        },
        _sum: { total: true },
      }),

      // Completed bookings count in the selected period
      this.prisma.booking.count({
        where: {
          status: 'DELIVERED',
          createdAt: { gte: startDate, lte: endDate },
          seat: { event: { sellerId: userId } },
        },
      }),

      // Cancelled bookings count in the selected period
      this.prisma.booking.count({
        where: {
          status: 'CANCELLED',
          createdAt: { gte: startDate, lte: endDate },
          seat: { event: { sellerId: userId } },
        },
      }),

      // Average rating for user's experiences
      this.prisma.review.aggregate({
        where: {
          revieweeId: userId,
          status: 'APPROVED',
          createdAt: { gte: startDate, lte: endDate },
        },
        _avg: { rating: true },
      }),
    ]);

    // ---------- Chart & grouped datasets ----------
    // Bookings by status (for donut/pie)
    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      where: {
        seat: { event: { sellerId: userId } },
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { _all: true },
    });

    // NOTE: Experience model does not exist in current schema; omit revenueByExperience
    const revenueByExperience: any[] = [];

    // Time series (daily) for bookings/guests/revenue within range
    const bookingsForTrend = await this.prisma.booking.findMany({
      where: {
        seat: { event: { sellerId: userId } },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    // Build daily buckets
    const buckets: string[] = [];
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      buckets.push(format(d, 'yyyy-MM-dd'));
    }
    const bookingCountByDay = new Map<string, number>();
    const guestsByDay = new Map<string, number>();
    const revenueByDay = new Map<string, number>();
    buckets.forEach((b) => {
      bookingCountByDay.set(b, 0);
      guestsByDay.set(b, 0);
      revenueByDay.set(b, 0);
    });
    for (const b of bookingsForTrend) {
      const key = format(b.createdAt, 'yyyy-MM-dd');
      bookingCountByDay.set(key, (bookingCountByDay.get(key) || 0) + 1);

      revenueByDay.set(
        key,
        (revenueByDay.get(key) || 0) + Number(b.total || 0),
      );
    }
    const bookingsTrend = buckets.map((date) => ({
      date,
      count: bookingCountByDay.get(date) || 0,
    }));
    // guestsTrend not available (no guestCount); approximate as booking count
    const guestsTrend = buckets.map((date) => ({
      date,
      guests: bookingCountByDay.get(date) || 0,
    }));
    const revenueTrend = buckets.map((date) => ({
      date,
      total: revenueByDay.get(date) || 0,
    }));

    // Rating distribution (1-5) for bar chart
    const reviewsForDist = await this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        status: 'APPROVED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { rating: true },
    });
    const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
      rating: r,
      count: reviewsForDist.filter((rv) => Math.round(rv.rating as any) === r)
        .length,
    }));

    // Payout summary (quick snapshot for cards)
    const [
      currentBalanceAgg,
      upcomingPayoutAgg,
      totalWithdrawAgg,
      pendingWithdrawAgg,
    ] = await Promise.all([
      // Current balance based on sellerAmount from successful booking payments tied to seller's events
      this.prisma.transaction.aggregate({
        where: {
          type: 'BOOKING_PAYMENT',
          status: 'SUCCESS',
          event: { sellerId: userId },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { sellerAmount: true },
      }),
      // Upcoming payout for seller
      this.prisma.transaction.aggregate({
        where: {
          type: 'SELLER_PAYOUT',
          status: { in: ['PENDING', 'PROCESSING'] },
          payeeId: userId,
        },
        _sum: { amount: true },
      }),
      // Completed withdrawals for seller
      this.prisma.withdrawalRequest.aggregate({
        where: {
          sellerId: userId,
          status: 'COMPLETED',
          OR: [
            { processedAt: { gte: startDate, lte: endDate } },
            {
              AND: [
                { processedAt: null },
                { requestedAt: { gte: startDate, lte: endDate } },
              ],
            },
          ],
        },
        _sum: { amount: true },
      }),
      // Pending withdrawals for seller
      this.prisma.withdrawalRequest.aggregate({
        where: {
          sellerId: userId,
          status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      // Core metrics
      upcomingGuests,
      newBookings,
      unreadMessages,
      pendingReviews,

      // Financial metrics
      earnings,
      totalRevenue: totalRevenue._sum.total || 0,

      // Booking metrics
      completedBookings,
      cancelledBookings,

      // Quality metrics
      averageRating: averageRating._avg.rating || 0,

      // Recent data
      recentBookings,
      activeConversations,
      lastThreePendingReviews,

      // Chart-friendly datasets
      charts: {
        bookingsTrend, // line
        guestsTrend, // line/area
        revenueTrend, // line/area
        bookingsByStatus: bookingsByStatus.map((x) => ({
          status: x.status,
          count: x._count._all,
        })), // pie/donut
        ratingDistribution, // bar
        revenueByExperience, // bar (top 5)
      },

      // Payout snapshot for cards
      payoutSummary: {
        currentBalance: Number(currentBalanceAgg._sum.sellerAmount || 0),
        upcomingPayout: Number(upcomingPayoutAgg._sum.amount || 0),
        totalWithdraw: Number(totalWithdrawAgg._sum.amount || 0),
        pendingWithdraw: Number(pendingWithdrawAgg._sum.amount || 0),
      },

      // Meta information
      duration,
      dateRange: {
        startDate,
        endDate,
      },
    };
  }

  private getDateRange(duration: string) {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (duration) {
      case 'today':
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        startDate = startOfDay(yesterday);
        endDate = endOfDay(yesterday);
        break;
      case '7d':
        startDate = startOfDay(
          new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        );
        endDate = endOfDay(today);
        break;
      case '30d':
        startDate = startOfDay(
          new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        );
        endDate = endOfDay(today);
        break;
      case '90d':
        startDate = startOfDay(
          new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
        );
        endDate = endOfDay(today);
        break;
      case '1y':
        startDate = startOfDay(
          new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
        );
        endDate = endOfDay(today);
        break;
      case 'all':
        startDate = new Date(2000, 0, 1);
        endDate = endOfDay(today);
        break;
      default:
        startDate = startOfDay(
          new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        );
        endDate = endOfDay(today);
    }

    return { startDate, endDate };
  }

  //total earnings, upcoming payout, total withdraw and pending withdraw and monthly earnings

  async getHostEarnings(userId: string, query: any) {
    //query duration today weekly and monthly
    const { duration } = query;
    const { startDate, endDate } = this.getDateRange(duration);

    // Aggregate host payouts (via transactions)
    const [
      currentBalance,
      totalPayoutAgg,
      upcomingPayoutAgg,
      totalWithdrawAgg,
      pendingWithdrawAgg,
      monthlyEarnings,
    ] = await Promise.all([
      //current balance
      this.prisma.transaction.aggregate({
        where: {
          type: 'BOOKING_PAYMENT',
          status: 'SUCCESS',
          payeeId: userId,
          // Use processedAt if available, fallback to createdAt for safety
          OR: [{ createdAt: { gte: startDate, lte: endDate } }],
        },
        _sum: { amount: true },
      }),
      // Total earnings: successful HOST_PAYOUT transactions to this host within range
      this.prisma.transaction.aggregate({
        where: {
          type: 'SELLER_PAYOUT',
          status: 'SUCCESS',
          payeeId: userId,
          // Use processedAt if available, fallback to createdAt for safety
          OR: [
            { processedAt: { gte: startDate, lte: endDate } },
            { createdAt: { gte: startDate, lte: endDate } },
          ],
        },
        _sum: { amount: true },
      }),

      // Upcoming payout: payouts initiated but not yet completed (no date filter)
      this.prisma.transaction.aggregate({
        where: {
          type: 'SELLER_PAYOUT',
          status: { in: ['PENDING', 'PROCESSING'] },
          payeeId: userId,
        },
        _sum: { amount: true },
      }),

      // Total withdraw completed within range
      this.prisma.withdrawalRequest.aggregate({
        where: {
          sellerId: userId,
          status: 'COMPLETED',
          OR: [
            { processedAt: { gte: startDate, lte: endDate } },
            {
              AND: [
                { processedAt: null },
                { requestedAt: { gte: startDate, lte: endDate } },
              ],
            },
          ],
        },
        _sum: { amount: true },
      }),

      // Pending withdraw requests (no date filter)
      this.prisma.withdrawalRequest.aggregate({
        where: {
          sellerId: userId,
          status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
        },
        _sum: { amount: true },
      }),
      // Monthly earnings (existing helper; currently based on completed bookings total)
      this.getEarningsByMonth(userId),
    ]);

    return {
      currentBalance: Number(currentBalance._sum.amount || 0),
      totalEarnings: Number(totalPayoutAgg._sum.amount || 0),
      upcomingPayout: Number(upcomingPayoutAgg._sum.amount || 0),
      totalWithdraw: Number(totalWithdrawAgg._sum.amount || 0),
      pendingWithdraw: Number(pendingWithdrawAgg._sum.amount || 0),
      monthlyEarnings,
      duration,
      dateRange: { startDate, endDate },
    };
  }

  async getHostCalendar(userId: string, query: any) {
    // Parse optional filters
    const { startDate, endDate, status, location } = query || {};

    const from = startDate ? new Date(startDate) : startOfYear(new Date());
    const to = endDate ? new Date(endDate) : endOfYear(new Date());

    const events = await this.prisma.event.findMany({
      where: {
        sellerId: userId,
        startTime: { gte: from, lte: to },
        ...(status ? { status } : {}),
        ...(location
          ? { venue: { contains: String(location), mode: 'insensitive' } }
          : {}),
      },
      orderBy: { startTime: 'asc' },
    });

    const now = new Date();

    const mapped = events.map((e) => {
      const isPast = e.endTime ? e.endTime < now : e.startTime < now;
      const uiStatus: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' =
        e.status === 'CANCELLED'
          ? 'Cancelled'
          : isPast
            ? 'Completed'
            : e.startTime <= now && e.endTime && e.endTime >= now
              ? 'Ongoing'
              : 'Upcoming';

      const color =
        uiStatus === 'Upcoming'
          ? 'bg-[#009933]'
          : uiStatus === 'Ongoing'
            ? 'bg-[#FF8000]'
            : uiStatus === 'Cancelled'
              ? 'bg-[#FF3333]'
              : 'bg-[#1A1A1A]';

      const time = e.startTime ? format(e.startTime, 'HH:mm') : '';
      let duration = '';
      if (e.startTime && e.endTime) {
        try {
          const mins = Math.max(0, differenceInMinutes(e.endTime, e.startTime));
          duration = `${mins}min`;
        } catch {
          duration = '';
        }
      }

      return {
        id: e.id,
        title: e.title,
        start: e.startTime,
        end: e.endTime,
        date: e.startTime.getDate(),
        rawDate: e.startTime,
        time,
        duration,
        color,
        location: e.venue || '',
        status: uiStatus,
      };
    });

    return {
      status: true,
      data: mapped,
      range: { start: from, end: to },
      total: mapped.length,
    };
  }

  async getAdminDashboard(query: any) {
    const parsedQuery = AdminDashboardQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      return {
        status: false,
        message: 'Invalid query parameters',
      };
    }

    const { duration } = parsedQuery.data;
    const { startDate, endDate } = this.getDateRange(duration);

    // previous period for growth calculation
    const spanMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);

    // Core counts and sums (schema-aligned)
    const [
      totalUsers,
      totalSellers,
      totalEvents,
      totalBookings,
      bookingsByStatusAgg,
      revenueAgg,
      platformFeeAgg,
      payoutsAgg,
      // Previous period
      prevRevenueAgg,
      prevBookingsCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { roles: { some: { role: { name: 'SELLER' } } } },
      }),
      this.prisma.event.count(),
      this.prisma.booking.count({
        where: { createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'BOOKING_PAYMENT',
          status: 'SUCCESS',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'BOOKING_PAYMENT',
          status: 'SUCCESS',
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { platformFee: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'SELLER_PAYOUT',
          status: 'SUCCESS',
          OR: [
            { processedAt: { gte: startDate, lte: endDate } },
            { createdAt: { gte: startDate, lte: endDate } },
          ],
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'BOOKING_PAYMENT',
          status: 'SUCCESS',
          createdAt: { gte: prevStart, lte: prevEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.booking.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
    ]);

    // Omit experience-based chart, not present in schema
    const revenueByExperience: any[] = [];

    // Revenue by category (pie)
    // Category breakdown omitted, as bookings not directly linked to categories in current schema
    const revenueByCategory: any[] = [];

    // Trends (daily) for bookings and revenue
    const bookingsForTrend = await this.prisma.booking.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });
    const buckets: string[] = [];
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      buckets.push(format(d, 'yyyy-MM-dd'));
    }
    const bookingCountByDay = new Map<string, number>();
    const revenueByDay = new Map<string, number>();
    buckets.forEach((b) => {
      bookingCountByDay.set(b, 0);
      revenueByDay.set(b, 0);
    });
    for (const b of bookingsForTrend) {
      const key = format(b.createdAt, 'yyyy-MM-dd');
      bookingCountByDay.set(key, (bookingCountByDay.get(key) || 0) + 1);
      revenueByDay.set(
        key,
        (revenueByDay.get(key) || 0) + Number(b.total || 0),
      );
    }
    const bookingsTrend = buckets.map((date) => ({
      date,
      count: bookingCountByDay.get(date) || 0,
    }));
    const revenueTrend = buckets.map((date) => ({
      date,
      total: revenueByDay.get(date) || 0,
    }));

    const totalRevenue = Number(revenueAgg._sum.amount || 0);
    const totalPlatformFee = Number(platformFeeAgg._sum.platformFee || 0);
    const totalPayouts = Number(payoutsAgg._sum.amount || 0);
    const prevRevenue = Number(prevRevenueAgg._sum.amount || 0);

    const calcGrowth = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(2));
    };

    const response = {
      status: true,
      duration,
      dateRange: { startDate, endDate },
      metrics: {
        totalUsers,
        totalSellers,
        totalEvents,
        totalBookings,
        totalRevenue,
        totalPlatformFee,
        totalPayouts,
        growth: {
          revenuePct: calcGrowth(totalRevenue, prevRevenue),
          bookingsPct: calcGrowth(totalBookings, prevBookingsCount),
        },
      },
      charts: {
        bookingsByStatus: bookingsByStatusAgg.map((x) => ({
          status: x.status,
          count: x._count._all,
        })),
        revenueByExperience,
        revenueByCategory,
        bookingsTrend, // line
        revenueTrend, // line
      },
    };

    return response;
  }

  private async getEarningsByMonth(userId: string) {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());

    const bookings = await this.prisma.booking.findMany({
      where: {
        seat: { event: { sellerId: userId } },
        status: { in: ['DELIVERED', 'CONFIRMED'] },
      },
      select: { id: true, createdAt: true, total: true },
    });

    const months = Array(12).fill(0);
    bookings.forEach((b) => {
      const monthIndex = b.createdAt.getMonth();
      months[monthIndex] += Number(b.total);
    });

    return months.map((total, idx) => ({
      month: idx + 1,
      total,
    }));
  }
}
