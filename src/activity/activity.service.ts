import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AdminQueryDto, adminQuerySchema } from './dto/admin.query.dto';

type DateRangeKey =
  | 'today'
  | 'yesterday'
  | '7d'
  | '15d'
  | 'thisWeek'
  | 'this_month'
  | 'thisMonth'
  | 'last_6_months'
  | 'this_year'
  | 'thisYear'
  | 'last_year'
  | 'all';

export interface LogActivityInput {
  userId: string;
  type: string; // e.g. EXPERIENCE, BOOKING, AUTH, SYSTEM
  action: string; // e.g. CREATED, UPDATED, DELETED, LOGIN, LOGOUT
  metadata?: string; // small JSON string or text summary
  ipAddress?: string | null;
}

export interface ActivityListQuery {
  page?: number;
  limit?: number;
  range?: DateRangeKey;
  type?: string; // exact match
  action?: string; // exact match
  userId?: string; // exact match
  search?: string; // search on userId, action, metadata
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Reusable method to log an activity from anywhere in the app
  async log({ userId, type, action, metadata, ipAddress }: LogActivityInput) {
    return this.prisma.activityLog.create({
      data: {
        userId,
        type,
        action,
        ...(metadata ? { metadata } : {}),
        ...(ipAddress ? { ipAddress } : {}),
      },
    });
  }

  private getDateRange(
    range: DateRangeKey | undefined,
  ): { gte?: Date; lt?: Date } | undefined {
    if (!range || range === 'all') return undefined;
    const now = new Date();

    const startOfDay = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startOfWeek = (d: Date) => {
      // Start of week = Monday
      const day = d.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMonday = (day + 6) % 7; // Sun -> 6, Mon -> 0, ...
      const s = startOfDay(new Date(d));
      s.setDate(s.getDate() - diffToMonday);
      return s;
    };
    const startOfMonth = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), 1);
    const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

    const addDays = (d: Date, days: number) =>
      new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
    const addMonths = (d: Date, months: number) =>
      new Date(d.getFullYear(), d.getMonth() + months, d.getDate());

    switch (range) {
      case 'today': {
        const gte = startOfDay(now);
        const lt = addDays(gte, 1);
        return { gte, lt };
      }
      case 'yesterday': {
        const lt = startOfDay(now);
        const gte = addDays(lt, -1);
        return { gte, lt };
      }
      case '7d': {
        const lt = addDays(startOfDay(now), 1);
        const gte = addDays(lt, -7);
        return { gte, lt };
      }
      case '15d': {
        const lt = addDays(startOfDay(now), 1);
        const gte = addDays(lt, -15);
        return { gte, lt };
      }
      case 'thisWeek': {
        const gte = startOfWeek(now);
        const lt = addDays(gte, 7);
        return { gte, lt };
      }
      case 'this_month': {
        const gte = startOfMonth(now);
        const lt = addMonths(gte, 1);
        return { gte, lt };
      }
      case 'thisMonth': {
        const gte = startOfMonth(now);
        const lt = addMonths(gte, 1);
        return { gte, lt };
      }
      case 'last_6_months': {
        const lt = addMonths(startOfMonth(now), 1);
        const gte = addMonths(lt, -6);
        return { gte, lt };
      }
      case 'this_year': {
        const gte = startOfYear(now);
        const lt = new Date(now.getFullYear() + 1, 0, 1);
        return { gte, lt };
      }
      case 'thisYear': {
        const gte = startOfYear(now);
        const lt = new Date(now.getFullYear() + 1, 0, 1);
        return { gte, lt };
      }
      case 'last_year': {
        const thisYearStart = startOfYear(now);
        const gte = new Date(thisYearStart.getFullYear() - 1, 0, 1);
        const lt = thisYearStart;
        return { gte, lt };
      }
      default:
        return undefined;
    }
  }

  async list(query: AdminQueryDto) {
    const parsedQuery = adminQuerySchema.safeParse(query);
    if (!parsedQuery.success) {
      throw new Error('Invalid query parameters');
    }

    const {
      page = '1',
      limit = '10',
      range,
      from,
      to,
      type,
      action,
      userId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = parsedQuery.data;

    const limitInt = Number(limit);
    const pageInt = Number(page);
    const skip = (pageInt - 1) * limitInt;

    const where: any = {};

    // Date range: explicit from/to overrides preset range
    if (from || to) {
      // Expecting YYYY-MM-DD
      const start = from ? new Date(from + 'T00:00:00.000Z') : undefined;
      const endExclusive = to
        ? new Date(new Date(to + 'T00:00:00.000Z').getTime() + 24 * 60 * 60 * 1000)
        : undefined;
      where.createdAt = {
        ...(start ? { gte: start } : {}),
        ...(endExclusive ? { lt: endExclusive } : {}),
      };
    } else {
      const dateRange = this.getDateRange(range);
      if (dateRange) {
        where.createdAt = dateRange;
      }
    }

    // Exact filters
    if (type) where.type = type;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    // Search across userId, action, metadata
    if (search) {
      const s = search.trim();
      where.OR = [
        { userId: { contains: s, mode: 'insensitive' } },
        { action: { contains: s, mode: 'insensitive' } },
        { metadata: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limitInt,
        // Note: avoid custom select until Prisma client is regenerated after schema changes
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limitInt),
      },
    };
  }
}
