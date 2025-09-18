// import { Injectable } from '@nestjs/common';
// import {
//   endOfDay,
//   endOfYear,
//   startOfDay,
//   startOfYear,
//   addDays,
//   format,
//   isBefore,
//   differenceInMinutes,
// } from 'date-fns';
// import { PrismaService } from 'src/prisma/prisma.service';
// import {
//   DashboardQueryDto,
//   DashboardQuerySchema,
// } from './dto/dashboard.query.dto';
// import { AdminDashboardQuerySchema } from './dto/admin.dashboard.query.dto';

// @Injectable()
// export class DashboardService {
//   constructor(private readonly prisma: PrismaService) {}

//   async getDashboardData(userId: string, query: DashboardQueryDto) {
//     const parsedQuery = DashboardQuerySchema.parse(query);
//     const { duration = '7d' } = parsedQuery;

//     // Calculate date ranges based on duration
//     const { startDate, endDate } = this.getDateRange(duration);

//     const [
//       upcomingGuests,
//       newBookings,
//       unreadMessages,
//       pendingReviews,
//       earnings,
//       recentBookings,
//       activeConversations,
//       lastThreePendingReviews,
//       totalRevenue,
//       completedBookings,
//       cancelledBookings,
//       averageRating,
//     ] = await Promise.all([
//       // Upcoming guests (confirmed bookings in the selected period)
//       this.prisma.booking.count({
//         where: {
//           experience: { userId },
//           startDate: { gte: startDate, lte: endDate },
//           status: { in: ['CONFIRMED'] },
//         },
//       }),

//       // New bookings created in the selected period
//       this.prisma.booking.count({
//         where: {
//           experience: { userId },
//           createdAt: { gte: startDate, lte: endDate },
//         },
//       }),

//       // Unread messages in the selected period
//       this.prisma.message.count({
//         where: {
//           receiverId: userId,
//           isRead: false,
//           sentAt: { gte: startDate, lte: endDate },
//         },
//       }),

//       // Pending reviews in the selected period
//       this.prisma.review.count({
//         where: {
//           revieweeId: userId,
//           status: 'PENDING',
//           createdAt: { gte: startDate, lte: endDate },
//         },
//       }),

//       // Earnings by month (only for this user)
//       this.getEarningsByMonth(userId),

//       // Latest 5 bookings for this user
//       this.prisma.booking.findMany({
//         where: { experience: { userId } },
//         take: 5,
//         orderBy: { createdAt: 'desc' },
//         include: {
//           experience: { select: { name: true, coverImage: true } },
//           user: { select: { name: true, avatar: true } },
//         },
//       }),

//       // Last 5 conversations
//       this.prisma.messageRoom.findMany({
//         where: { receiverId: userId },
//         take: 5,
//         orderBy: { createdAt: 'desc' },
//         include: {
//           sender: { select: { name: true, avatar: true } },
//           receiver: { select: { name: true, avatar: true } },
//           messages: {
//             orderBy: { sentAt: 'desc' },
//             take: 1,
//             select: {
//               id: true,
//               message: true,
//               sentAt: true,
//               isRead: true,
//             },
//           },
//         },
//       }),

//       // Last 3 pending reviews
//       this.prisma.review.findMany({
//         where: { revieweeId: userId, status: 'PENDING' },
//         take: 3,
//         orderBy: { createdAt: 'desc' },
//         include: {
//           experience: { select: { name: true, coverImage: true } },
//           reviewer: { select: { name: true, avatar: true } },
//         },
//       }),

//       // Total revenue in the selected period
//       this.prisma.booking.aggregate({
//         where: {
//           experience: { userId },
//           status: 'COMPLETED',
//           createdAt: { gte: startDate, lte: endDate },
//         },

//         _sum: { total: true },
//       }),

//       // Completed bookings count in the selected period
//       this.prisma.booking.count({
//         where: {
//           experience: { userId },
//           status: 'COMPLETED',
//           createdAt: { gte: startDate, lte: endDate },
//         },
//       }),

//       // Cancelled bookings count in the selected period
//       this.prisma.booking.count({
//         where: {
//           experience: { userId },
//           status: 'CANCELLED',
//           createdAt: { gte: startDate, lte: endDate },
//         },
//       }),

//       // Average rating for user's experiences
//       this.prisma.review.aggregate({
//         where: {
//           revieweeId: userId,
//           status: 'APPROVED',
//           createdAt: { gte: startDate, lte: endDate },
//         },
//         _avg: { rating: true },
//       }),
//     ]);

//     // ---------- Chart & grouped datasets ----------
//     // Bookings by status (for donut/pie)
//     const bookingsByStatus = await this.prisma.booking.groupBy({
//       by: ['status'],
//       where: {
//         experience: { userId },
//         createdAt: { gte: startDate, lte: endDate },
//       },
//       _count: { _all: true },
//     });

//     // Revenue by experience (Top 5) for bar chart
//     const revenueByExperienceAgg = await this.prisma.booking.groupBy({
//       by: ['experienceId'],
//       where: {
//         experience: { userId },
//         status: 'COMPLETED',
//         createdAt: { gte: startDate, lte: endDate },
//       },
//       _sum: { total: true },
//     });
//     const expIds = revenueByExperienceAgg.map((x) => x.experienceId);
//     const expMap = new Map(
//       (
//         await this.prisma.experience.findMany({
//           where: { id: { in: expIds } },
//           select: { id: true, name: true },
//         })
//       ).map((e) => [e.id, e.name]),
//     );
//     const revenueByExperience = revenueByExperienceAgg
//       .map((x) => ({
//         experienceId: x.experienceId,
//         experienceName: expMap.get(x.experienceId) || 'Unknown',
//         total: Number(x._sum.total || 0),
//       }))
//       .sort((a, b) => b.total - a.total)
//       .slice(0, 5);

//     // Time series (daily) for bookings/guests/revenue within range
//     const bookingsForTrend = await this.prisma.booking.findMany({
//       where: {
//         experience: { userId },
//         createdAt: { gte: startDate, lte: endDate },
//       },
//       select: { createdAt: true, guestCount: true, total: true },
//       orderBy: { createdAt: 'asc' },
//     });

//     // Build daily buckets
//     const buckets: string[] = [];
//     for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
//       buckets.push(format(d, 'yyyy-MM-dd'));
//     }
//     const bookingCountByDay = new Map<string, number>();
//     const guestsByDay = new Map<string, number>();
//     const revenueByDay = new Map<string, number>();
//     buckets.forEach((b) => {
//       bookingCountByDay.set(b, 0);
//       guestsByDay.set(b, 0);
//       revenueByDay.set(b, 0);
//     });
//     for (const b of bookingsForTrend) {
//       const key = format(b.createdAt, 'yyyy-MM-dd');
//       bookingCountByDay.set(key, (bookingCountByDay.get(key) || 0) + 1);
//       guestsByDay.set(
//         key,
//         (guestsByDay.get(key) || 0) + Number(b.guestCount || 0),
//       );
//       revenueByDay.set(
//         key,
//         (revenueByDay.get(key) || 0) + Number(b.total || 0),
//       );
//     }
//     const bookingsTrend = buckets.map((date) => ({
//       date,
//       count: bookingCountByDay.get(date) || 0,
//     }));
//     const guestsTrend = buckets.map((date) => ({
//       date,
//       guests: guestsByDay.get(date) || 0,
//     }));
//     const revenueTrend = buckets.map((date) => ({
//       date,
//       total: revenueByDay.get(date) || 0,
//     }));

//     // Rating distribution (1-5) for bar chart
//     const reviewsForDist = await this.prisma.review.findMany({
//       where: {
//         revieweeId: userId,
//         status: 'APPROVED',
//         createdAt: { gte: startDate, lte: endDate },
//       },
//       select: { rating: true },
//     });
//     const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
//       rating: r,
//       count: reviewsForDist.filter((rv) => Math.round(rv.rating as any) === r)
//         .length,
//     }));

//     // Payout summary (quick snapshot for cards)
//     const [
//       currentBalanceAgg,
//       upcomingPayoutAgg,
//       totalWithdrawAgg,
//       pendingWithdrawAgg,
//     ] = await Promise.all([
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'BOOKING_PAYMENT',
//           status: 'SUCCESS',
//           payeeId: userId,
//           OR: [{ createdAt: { gte: startDate, lte: endDate } }],
//         },
//         _sum: { amount: true },
//       }),
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'HOST_PAYOUT',
//           status: { in: ['PENDING', 'PROCESSING'] },
//           payeeId: userId,
//         },
//         _sum: { amount: true },
//       }),
//       this.prisma.withdrawalRequest.aggregate({
//         where: {
//           hostId: userId,
//           status: 'COMPLETED',
//           OR: [
//             { processedAt: { gte: startDate, lte: endDate } },
//             {
//               AND: [
//                 { processedAt: null },
//                 { requestedAt: { gte: startDate, lte: endDate } },
//               ],
//             },
//           ],
//         },
//         _sum: { amount: true },
//       }),
//       this.prisma.withdrawalRequest.aggregate({
//         where: {
//           hostId: userId,
//           status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
//         },
//         _sum: { amount: true },
//       }),
//     ]);

//     return {
//       // Core metrics
//       upcomingGuests,
//       newBookings,
//       unreadMessages,
//       pendingReviews,

//       // Financial metrics
//       earnings,
//       totalRevenue: totalRevenue._sum.total || 0,

//       // Booking metrics
//       completedBookings,
//       cancelledBookings,

//       // Quality metrics
//       averageRating: averageRating._avg.rating || 0,

//       // Recent data
//       recentBookings,
//       activeConversations,
//       lastThreePendingReviews,

//       // Chart-friendly datasets
//       charts: {
//         bookingsTrend, // line
//         guestsTrend, // line/area
//         revenueTrend, // line/area
//         bookingsByStatus: bookingsByStatus.map((x) => ({
//           status: x.status,
//           count: x._count._all,
//         })), // pie/donut
//         ratingDistribution, // bar
//         revenueByExperience, // bar (top 5)
//       },

//       // Payout snapshot for cards
//       payoutSummary: {
//         currentBalance: Number(currentBalanceAgg._sum.amount || 0),
//         upcomingPayout: Number(upcomingPayoutAgg._sum.amount || 0),
//         totalWithdraw: Number(totalWithdrawAgg._sum.amount || 0),
//         pendingWithdraw: Number(pendingWithdrawAgg._sum.amount || 0),
//       },

//       // Meta information
//       duration,
//       dateRange: {
//         startDate,
//         endDate,
//       },
//     };
//   }

//   private getDateRange(duration: string) {
//     const today = new Date();
//     let startDate: Date;
//     let endDate: Date;

//     switch (duration) {
//       case 'today':
//         startDate = startOfDay(today);
//         endDate = endOfDay(today);
//         break;
//       case 'yesterday':
//         const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
//         startDate = startOfDay(yesterday);
//         endDate = endOfDay(yesterday);
//         break;
//       case '7d':
//         startDate = startOfDay(
//           new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
//         );
//         endDate = endOfDay(today);
//         break;
//       case '30d':
//         startDate = startOfDay(
//           new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
//         );
//         endDate = endOfDay(today);
//         break;
//       case '90d':
//         startDate = startOfDay(
//           new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
//         );
//         endDate = endOfDay(today);
//         break;
//       case '1y':
//         startDate = startOfDay(
//           new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
//         );
//         endDate = endOfDay(today);
//         break;
//       case 'all':
//         startDate = new Date(2000, 0, 1);
//         endDate = endOfDay(today);
//         break;
//       default:
//         startDate = startOfDay(
//           new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
//         );
//         endDate = endOfDay(today);
//     }

//     return { startDate, endDate };
//   }

//   //total earnings, upcoming payout, total withdraw and pending withdraw and monthly earnings

//   async getHostEarnings(userId: string, query: any) {
//     //query duration today weekly and monthly
//     const { duration } = query;
//     const { startDate, endDate } = this.getDateRange(duration);

//     // Aggregate host payouts (via transactions)
//     const [
//       currentBalance,
//       totalPayoutAgg,
//       upcomingPayoutAgg,
//       totalWithdrawAgg,
//       pendingWithdrawAgg,
//       monthlyEarnings,
//     ] = await Promise.all([
//       //current balance
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'BOOKING_PAYMENT',
//           status: 'SUCCESS',
//           payeeId: userId,
//           // Use processedAt if available, fallback to createdAt for safety
//           OR: [{ createdAt: { gte: startDate, lte: endDate } }],
//         },
//         _sum: { amount: true },
//       }),
//       // Total earnings: successful HOST_PAYOUT transactions to this host within range
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'HOST_PAYOUT',
//           status: 'SUCCESS',
//           payeeId: userId,
//           // Use processedAt if available, fallback to createdAt for safety
//           OR: [
//             { processedAt: { gte: startDate, lte: endDate } },
//             { createdAt: { gte: startDate, lte: endDate } },
//           ],
//         },
//         _sum: { amount: true },
//       }),

//       // Upcoming payout: payouts initiated but not yet completed (no date filter)
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'HOST_PAYOUT',
//           status: { in: ['PENDING', 'PROCESSING'] },
//           payeeId: userId,
//         },
//         _sum: { amount: true },
//       }),

//       // Total withdraw completed within range
//       this.prisma.withdrawalRequest.aggregate({
//         where: {
//           hostId: userId,
//           status: 'COMPLETED',
//           OR: [
//             { processedAt: { gte: startDate, lte: endDate } },
//             {
//               AND: [
//                 { processedAt: null },
//                 { requestedAt: { gte: startDate, lte: endDate } },
//               ],
//             },
//           ],
//         },
//         _sum: { amount: true },
//       }),

//       // Pending withdraw requests (no date filter)
//       this.prisma.withdrawalRequest.aggregate({
//         where: {
//           hostId: userId,
//           status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
//         },
//         _sum: { amount: true },
//       }),
//       // Monthly earnings (existing helper; currently based on completed bookings total)
//       this.getEarningsByMonth(userId),
//     ]);

//     return {
//       currentBalance: Number(currentBalance._sum.amount || 0),
//       totalEarnings: Number(totalPayoutAgg._sum.amount || 0),
//       upcomingPayout: Number(upcomingPayoutAgg._sum.amount || 0),
//       totalWithdraw: Number(totalWithdrawAgg._sum.amount || 0),
//       pendingWithdraw: Number(pendingWithdrawAgg._sum.amount || 0),
//       monthlyEarnings,
//       duration,
//       dateRange: { startDate, endDate },
//     };
//   }

//   async getHostCalendar(userId: string, query: any) {
//     // Parse optional filters
//     const {
//       startDate,
//       endDate,
//       status, // 'Available' | 'Unavailable' | 'Past Session' or EventStatus values
//       experienceId,
//       location, // matches experience.city/state/country/name contains
//     } = query || {};

//     const from = startDate ? new Date(startDate) : startOfYear(new Date());
//     const to = endDate ? new Date(endDate) : endOfYear(new Date());

//     // Build Prisma where clause
//     const where: any = {
//       experience: { userId },
//       date: { gte: from, lte: to },
//     };

//     if (experienceId) {
//       where.experienceId = experienceId;
//     }

//     // Fetch with related Experience data needed for mapping
//     const events = await this.prisma.events.findMany({
//       where,
//       orderBy: { date: 'asc' },
//       include: {
//         experience: {
//           select: {
//             name: true,
//             city: true,
//             state: true,
//             country: true,
//             category: { select: { name: true } },
//           },
//         },
//       },
//     });

//     // Optional location filter on experience fields
//     const locationFiltered = location
//       ? events.filter((e) => {
//           const l = `${e.experience?.city || ''} ${e.experience?.state || ''} ${
//             e.experience?.country || ''
//           } ${e.experience?.name || ''}`
//             .toLowerCase()
//             .trim();
//           return l.includes(String(location).toLowerCase());
//         })
//       : events;

//     const now = new Date();

//     // Map DB events to calendar UI shape
//     const mapped = locationFiltered.map((e) => {
//       // Status mapping for calendar UI
//       // Available: future and isAvailable and not CANCELLED
//       // Unavailable: !isAvailable or CANCELLED
//       // Past Session: date in past or COMPLETED
//       let uiStatus: 'Available' | 'Unavailable' | 'Past Session' = 'Available';
//       if (e.status === 'CANCELLED' || !e.isAvailable) uiStatus = 'Unavailable';
//       if (isBefore(e.date, startOfDay(now)) || e.status === 'COMPLETED')
//         uiStatus = 'Past Session';

//       const color =
//         uiStatus === 'Available'
//           ? 'bg-[#009933]'
//           : uiStatus === 'Unavailable'
//             ? 'bg-[#FF8000]'
//             : 'bg-[#1A1A1A]';

//       const type =
//         uiStatus === 'Available'
//           ? 'confirmed'
//           : uiStatus === 'Unavailable'
//             ? 'unavailable'
//             : 'past';

//       // Time formatting and duration
//       const time = e.startTime ? format(e.startTime, 'HH:mm') : '';
//       // Try to compute duration if both times exist, fallback to empty string
//       let duration = '';
//       if (e.startTime && e.endTime) {
//         try {
//           const mins = Math.max(0, differenceInMinutes(e.endTime, e.startTime));
//           duration = `${mins}min`;
//         } catch {
//           duration = '';
//         }
//       }

//       const experienceType = e.experience?.category?.name || 'Experience';
//       const locationStr =
//         e.experience?.city ||
//         e.experience?.state ||
//         e.experience?.country ||
//         '';

//       return {
//         id: e.id,
//         title: e.title || e.experience?.name || 'Experience',
//         // Day number within the month for the UI grid
//         date: e.date.getDate(),
//         // Keep rawDate for potential consumers needing full date
//         rawDate: e.date,
//         time,
//         duration,
//         type,
//         color,
//         maxGuests: e.maxGuest,
//         location: locationStr,
//         notes: e.notes || '',
//         experienceType,
//         status: uiStatus,
//       };
//     });

//     // Optional status filter on mapped UI statuses or EventStatus
//     const statusNorm = (status || '').toString().toLowerCase();
//     const filtered = status
//       ? mapped.filter((m) =>
//           [m.status.toLowerCase(), m.type.toLowerCase()].includes(statusNorm),
//         )
//       : mapped;

//     return {
//       status: true,
//       data: filtered,
//       range: { start: from, end: to },
//       total: filtered.length,
//     };
//   }

//   async getAdminDashboard(query: any) {
//     const parsedQuery = AdminDashboardQuerySchema.safeParse(query);

//     if (!parsedQuery.success) {
//       return {
//         status: false,
//         message: 'Invalid query parameters',
//       };
//     }

//     const { duration } = parsedQuery.data;
//     const { startDate, endDate } = this.getDateRange(duration);

//     // previous period for growth calculation
//     const spanMs = endDate.getTime() - startDate.getTime();
//     const prevEnd = new Date(startDate.getTime() - 1);
//     const prevStart = new Date(prevEnd.getTime() - spanMs);

//     // Core counts and sums
//     const [
//       totalUsers,
//       totalHosts,
//       totalExperiences,
//       activeExperiences,
//       totalEvents,
//       totalBookings,
//       bookingsByStatusAgg,
//       revenueAgg,
//       platformFeeAgg,
//       payoutsAgg,
//       // Previous period
//       prevRevenueAgg,
//       prevBookingsCount,
//     ] = await Promise.all([
//       // Users
//       this.prisma.user.count(),
//       // Hosts by role relation
//       this.prisma.user.count({
//         where: { roles: { some: { role: { name: 'HOST' } } } },
//       }),
//       // Experiences
//       this.prisma.experience.count(),
//       this.prisma.experience.count({
//         where: { status: 'PUBLISHED', isActive: true },
//       }),
//       // Events
//       this.prisma.events.count(),
//       // Bookings in range
//       this.prisma.booking.count({
//         where: { createdAt: { gte: startDate, lte: endDate } },
//       }),
//       // Bookings by status for pie
//       this.prisma.booking.groupBy({
//         by: ['status'],
//         where: { createdAt: { gte: startDate, lte: endDate } },
//         _count: { _all: true },
//       }),
//       // Revenue from successful booking payments
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'BOOKING_PAYMENT',
//           status: 'SUCCESS',
//           createdAt: { gte: startDate, lte: endDate },
//         },
//         _sum: { amount: true },
//       }),
//       // Platform fee (our commission)
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'BOOKING_PAYMENT',
//           status: 'SUCCESS',
//           createdAt: { gte: startDate, lte: endDate },
//         },
//         _sum: { platformFee: true },
//       }),
//       // Host payouts executed in period
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'HOST_PAYOUT',
//           status: 'SUCCESS',
//           OR: [
//             { processedAt: { gte: startDate, lte: endDate } },
//             { createdAt: { gte: startDate, lte: endDate } },
//           ],
//         },
//         _sum: { amount: true },
//       }),
//       // Previous period comparisons
//       this.prisma.transaction.aggregate({
//         where: {
//           type: 'BOOKING_PAYMENT',
//           status: 'SUCCESS',
//           createdAt: { gte: prevStart, lte: prevEnd },
//         },
//         _sum: { amount: true },
//       }),
//       this.prisma.booking.count({
//         where: { createdAt: { gte: prevStart, lte: prevEnd } },
//       }),
//     ]);

//     // Top experiences by revenue (bar chart)
//     const topExpRevenueAgg = await this.prisma.transaction.groupBy({
//       by: ['experienceId'],
//       where: {
//         type: 'BOOKING_PAYMENT',
//         status: 'SUCCESS',
//         createdAt: { gte: startDate, lte: endDate },
//         experienceId: { not: null },
//       },
//       _sum: { amount: true },
//     });
//     const topExpIds = topExpRevenueAgg.map((t) => t.experienceId as string);
//     const topExpMap = new Map(
//       (
//         await this.prisma.experience.findMany({
//           where: { id: { in: topExpIds } },
//           select: { id: true, name: true },
//         })
//       ).map((e) => [e.id, e.name]),
//     );
//     const revenueByExperience = topExpRevenueAgg
//       .map((t) => ({
//         experienceId: t.experienceId,
//         experienceName: topExpMap.get(t.experienceId as string) || 'Unknown',
//         total: Number(t._sum.amount || 0),
//       }))
//       .sort((a, b) => b.total - a.total)
//       .slice(0, 10);

//     // Revenue by category (pie)
//     const bookingAggForCategory = await this.prisma.booking.groupBy({
//       by: ['experienceId'],
//       where: { createdAt: { gte: startDate, lte: endDate } },
//       _sum: { total: true },
//     });
//     const catExpIds = bookingAggForCategory.map((b) => b.experienceId);
//     const expWithCat = await this.prisma.experience.findMany({
//       where: { id: { in: catExpIds } },
//       select: {
//         id: true,
//         name: true,
//         category: { select: { id: true, name: true } },
//       },
//     });
//     const catMap = new Map<string, string>();
//     expWithCat.forEach((e) => {
//       catMap.set(e.id, e.category?.name || 'Uncategorized');
//     });
//     const revenueByCategoryMap = new Map<string, number>();
//     bookingAggForCategory.forEach((b) => {
//       const cat = catMap.get(b.experienceId) || 'Uncategorized';
//       revenueByCategoryMap.set(
//         cat,
//         (revenueByCategoryMap.get(cat) || 0) + Number(b._sum.total || 0),
//       );
//     });
//     const revenueByCategory = Array.from(revenueByCategoryMap.entries()).map(
//       ([category, total]) => ({ category, total }),
//     );

//     // Trends (daily) for bookings and revenue
//     const bookingsForTrend = await this.prisma.booking.findMany({
//       where: { createdAt: { gte: startDate, lte: endDate } },
//       select: { createdAt: true, total: true },
//       orderBy: { createdAt: 'asc' },
//     });
//     const buckets: string[] = [];
//     for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
//       buckets.push(format(d, 'yyyy-MM-dd'));
//     }
//     const bookingCountByDay = new Map<string, number>();
//     const revenueByDay = new Map<string, number>();
//     buckets.forEach((b) => {
//       bookingCountByDay.set(b, 0);
//       revenueByDay.set(b, 0);
//     });
//     for (const b of bookingsForTrend) {
//       const key = format(b.createdAt, 'yyyy-MM-dd');
//       bookingCountByDay.set(key, (bookingCountByDay.get(key) || 0) + 1);
//       revenueByDay.set(
//         key,
//         (revenueByDay.get(key) || 0) + Number(b.total || 0),
//       );
//     }
//     const bookingsTrend = buckets.map((date) => ({
//       date,
//       count: bookingCountByDay.get(date) || 0,
//     }));
//     const revenueTrend = buckets.map((date) => ({
//       date,
//       total: revenueByDay.get(date) || 0,
//     }));

//     const totalRevenue = Number(revenueAgg._sum.amount || 0);
//     const totalPlatformFee = Number(platformFeeAgg._sum.platformFee || 0);
//     const totalPayouts = Number(payoutsAgg._sum.amount || 0);
//     const prevRevenue = Number(prevRevenueAgg._sum.amount || 0);

//     const calcGrowth = (curr: number, prev: number) => {
//       if (prev === 0) return curr > 0 ? 100 : 0;
//       return Number((((curr - prev) / prev) * 100).toFixed(2));
//     };

//     const response = {
//       status: true,
//       duration,
//       dateRange: { startDate, endDate },
//       metrics: {
//         totalUsers,
//         totalHosts,
//         totalExperiences,
//         activeExperiences,
//         totalEvents,
//         totalBookings,
//         totalRevenue,
//         totalPlatformFee,
//         totalPayouts,
//         growth: {
//           revenuePct: calcGrowth(totalRevenue, prevRevenue),
//           bookingsPct: calcGrowth(totalBookings, prevBookingsCount),
//         },
//       },
//       charts: {
//         bookingsByStatus: bookingsByStatusAgg.map((x) => ({
//           status: x.status,
//           count: x._count._all,
//         })),
//         revenueByExperience, // bar
//         revenueByCategory, // pie
//         bookingsTrend, // line
//         revenueTrend, // line
//       },
//     };

//     return response;
//   }

//   private async getEarningsByMonth(userId: string) {
//     const start = startOfYear(new Date());
//     const end = endOfYear(new Date());

//     const bookings = await this.prisma.booking.findMany({
//       where: {
//         experience: { userId },
//         // createdAt: { gte: start, lte: end },
//         status: { in: ['COMPLETED', 'CONFIRMED'] },
//       },
//       select: { id: true, createdAt: true, total: true },
//     });

//     const months = Array(12).fill(0);
//     bookings.forEach((b) => {
//       const monthIndex = b.createdAt.getMonth();
//       months[monthIndex] += Number(b.total);
//     });

//     return months.map((total, idx) => ({
//       month: idx + 1,
//       total,
//     }));
//   }
// }
