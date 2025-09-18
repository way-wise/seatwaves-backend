import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PointRuleAction, RewardPointStatus, Prisma } from '@prisma/client';
import { queryRewardSchema } from './dto/query.reward.dto';

type AwardParams = {
  userId: string;
  action: PointRuleAction;
  amountCents?: number; // when perUnit=true, used to calculate points
  referencedId?: string; // e.g., orderId
  reason?: string;
  metadata?: Record<string, any>;
};

type RedeemParams = {
  userId: string;
  points: number;
  rewardCode?: string;
  metadata?: Record<string, any>;
};

@Injectable()
export class PointsService {
  constructor(private readonly prisma: PrismaService) {}

  private addMonths(date: Date, months: number): Date {
    const d = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
  }

  private async getOrCreateUserLoyalty(userId: string) {
    const ul = await this.prisma.userLoyalty.findUnique({ where: { userId } });
    if (ul) return ul;
    return this.prisma.userLoyalty.create({ data: { userId } });
  }

  async getRules() {
    const rules = await this.prisma.pointRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return {
      status: true,
      data: rules,
    };
  }

  async createRule(data: {
    action: PointRuleAction;
    name: string;
    basePoints: number;
    perUnit?: boolean;
    unitAmount?: number | null;
    tierMultipliers?: Prisma.InputJsonValue;
    expiryMonths?: number;
    active?: boolean;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.pointRule.create({ data: { ...data } });
  }

  async updateRule(id: string, data: Partial<Prisma.PointRuleUpdateInput>) {
    return this.prisma.pointRule.update({ where: { id }, data });
  }

  // Calculate points from rule and tier
  private calcPointsFromRule(
    rule: {
      basePoints: number;
      perUnit: boolean;
      unitAmount: number | null;
      tierMultipliers: any;
    },
    userTierName?: string,
    amountCents?: number,
  ): number {
    const base = rule.basePoints || 0;
    let points = 0;
    if (rule.perUnit) {
      const unitAmount = rule.unitAmount || 100; // default $1 if not provided
      const units = Math.floor((amountCents || 0) / unitAmount);
      points = units * base;
    } else {
      points = base;
    }
    const multipliers = (rule.tierMultipliers as Record<string, number>) || {};
    const mult =
      userTierName && multipliers[userTierName]
        ? Number(multipliers[userTierName])
        : 1.0;
    return Math.floor(points * (isFinite(mult) ? mult : 1.0));
  }

  async awardPoints(params: AwardParams) {
    const { userId, action, amountCents, referencedId, reason } = params;

    const rule = await this.prisma.pointRule.findFirst({
      where: { action, active: true },
    });
    if (!rule)
      throw new NotFoundException('No active point rule for this action');

    const ul = await this.getOrCreateUserLoyalty(userId);
    const tier = ul.tierId
      ? await this.prisma.loyaltyTier.findUnique({ where: { id: ul.tierId } })
      : null;
    const userTierName = tier?.name;

    const points = this.calcPointsFromRule(rule, userTierName, amountCents);
    if (points <= 0) {
      return {
        status: true,
        message: 'No points awarded (rule calculation resulted in 0).',
        points: 0,
      };
    }
    const now = new Date();
    const expiresAt = rule.expiryMonths
      ? this.addMonths(now, rule.expiryMonths)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.rewardPoints.create({
        data: {
          userId,
          ruleId: rule.id,
          action,
          points,
          remaining: points,
          status: RewardPointStatus.ACTIVE,
          reason: reason || rule.name,
          earnedAt: now,
          expiresAt,
          referencedId: referencedId || null,
        },
      });

      // Ensure the UserLoyalty row exists and atomically increment or create with initial values
      await tx.userLoyalty.upsert({
        where: { userId },
        create: {
          userId,
          currentPoints: points,
          totalEarned: points,
        },
        update: {
          currentPoints: { increment: points },
          totalEarned: { increment: points },
        },
      });
    });

    return { status: true, message: 'Points awarded', points };
  }

  async getRewardPoints(query: any) {
    const parsedQuery = queryRewardSchema.safeParse(query);
    if (!parsedQuery.success) {
      throw new BadRequestException(parsedQuery.error.message);
    }

    const {
      page = '1',
      limit = '10',
      sortBy,
      sortOrder = 'desc',
      search,
      userId,
      status,
      action,
      ruleId,
      earnedFrom,
      earnedTo,
      expiresFrom,
      expiresTo,
    } = parsedQuery.data as any;

    const pageInt = Math.max(1, Number(page || 1));
    const limitInt = Math.max(1, Math.min(100, Number(limit || 10)));
    const skip = (pageInt - 1) * limitInt;

    // Build where filters
    const where: Prisma.RewardPointsWhereInput = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (action) where.action = action;
    if (ruleId) where.ruleId = ruleId;

    // Date ranges
    if (earnedFrom || earnedTo) {
      where.earnedAt = {
        gte: earnedFrom ? new Date(earnedFrom) : undefined,
        lte: earnedTo ? new Date(earnedTo) : undefined,
      } as any;
    }
    if (expiresFrom || expiresTo) {
      where.expiresAt = {
        gte: expiresFrom ? new Date(expiresFrom) : undefined,
        lte: expiresTo ? new Date(expiresTo) : undefined,
      } as any;
    }

    // Search: supports "key=value" or broad search across common fields
    if (search && typeof search === 'string') {
      const eqIdx = search.indexOf('=');
      if (eqIdx > 0) {
        const key = search.slice(0, eqIdx).trim();
        const value = search.slice(eqIdx + 1).trim();
        if (key && value) {
          // Map supported exact filters
          if (key === 'userId') where.userId = value;
          else if (key === 'ruleId') where.ruleId = value;
          else if (key === 'status' && (value in RewardPointStatus))
            where.status = value as RewardPointStatus;
          else if (key === 'action' && (value in PointRuleAction))
            where.action = value as PointRuleAction;
          else if (key === 'referencedId') where.referencedId = value;
        }
      } else {
        const like = { contains: search, mode: 'insensitive' as const };
        where.OR = [
          { reason: like },
          { referencedId: like },
          { userId: like },
          { rule: { name: like } },
        ];
      }
    }

    // Sorting whitelist
    const sortWhitelist = new Set([
      'earnedAt',
      'expiresAt',
      'createdAt',
      'points',
      'remaining',
      'status',
      'action',
    ]);
    const orderBy: Prisma.RewardPointsOrderByWithRelationInput = sortBy &&
      sortWhitelist.has(sortBy)
        ? { [sortBy]: sortOrder as 'asc' | 'desc' }
        : { earnedAt: 'desc' };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.rewardPoints.findMany({
        where,
        orderBy,
        skip,
        take: limitInt,
        include: {
          user: { select: { id: true, name: true, email: true } },
          rule: { select: { id: true, name: true } },
        },
      }),
      this.prisma.rewardPoints.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limitInt));
    return {
      status: true,
      data,
      pagination: {
        page: pageInt,
        limit: limitInt,
        total,
        totalPages,
      },
    };
  }

  async redeemPoints(params: RedeemParams) {
    const { userId, points, rewardCode, metadata } = params;
    if (points <= 0) throw new BadRequestException('points must be > 0');

    return this.prisma.$transaction(async (tx) => {
      const ul = await this.getOrCreateUserLoyalty(userId);
      if (ul.currentPoints < points)
        throw new BadRequestException('Insufficient points');

      let remainingToRedeem = points;
      const batches = await tx.rewardPoints.findMany({
        where: { userId, status: RewardPointStatus.ACTIVE },
        orderBy: [{ earnedAt: 'asc' }],
      });

      for (const b of batches) {
        if (remainingToRedeem <= 0) break;
        const deduct = Math.min(b.remaining, remainingToRedeem);
        await tx.rewardPoints.update({
          where: { id: b.id },
          data: {
            remaining: b.remaining - deduct,
            status:
              b.remaining - deduct === 0
                ? RewardPointStatus.REDEEMED
                : RewardPointStatus.ACTIVE,
          },
        });
        remainingToRedeem -= deduct;
      }

      if (remainingToRedeem > 0)
        throw new BadRequestException(
          'Failed to redeem the requested points amount',
        );

      await tx.redemption.create({
        data: {
          userId,
          points,
          rewardCode: rewardCode || null,
          metadata: (metadata as any) || undefined,
        },
      });

      await tx.userLoyalty.update({
        where: { userId },
        data: {
          currentPoints: { decrement: points },
          totalRedeemed: { increment: points },
        },
      });

      return { status: true, message: 'Points redeemed', points };
    });
  }

  async getBalance(userId: string) {
    const ul = await this.getOrCreateUserLoyalty(userId);
    // next expiring batches
    const nextBatches = await this.prisma.rewardPoints.findMany({
      where: { userId, status: RewardPointStatus.ACTIVE },
      orderBy: [{ expiresAt: 'asc' }, { earnedAt: 'asc' }],
      take: 5,
      select: { id: true, remaining: true, expiresAt: true },
    });
    return {
      status: true,
      data: {
        currentPoints: ul.currentPoints,
        totalEarned: ul.totalEarned,
        totalRedeemed: ul.totalRedeemed,
        nextExpiring: nextBatches,
      },
    };
  }

  async getHistory(userId: string) {
    const [earned, redeemed] = await this.prisma.$transaction([
      this.prisma.rewardPoints.findMany({
        where: { userId },
        orderBy: [{ earnedAt: 'desc' }],
      }),
      this.prisma.redemption.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }],
      }),
    ]);
    return { status: true, data: { earned, redeemed } };
  }

  async recalcTier(userId: string) {
    // load tiers highest priority first
    const tiers = await this.prisma.loyaltyTier.findMany({
      where: { active: true },
      orderBy: { priority: 'desc' },
    });
    if (!tiers.length) return { status: true, message: 'No tiers configured' };
    const now = new Date();
    // compute totals per tier window and pick first match
    let chosen: { id: string } | null = null;
    for (const t of tiers) {
      const since = new Date(now);
      since.setUTCDate(since.getUTCDate() - t.durationDays);
      const totalInWindow = await this.prisma.rewardPoints.aggregate({
        where: { userId, earnedAt: { gte: since }, points: { gt: 0 } },
        _sum: { points: true },
      });
      const sum = Number(totalInWindow._sum.points || 0);
      if (sum >= t.minPoints) {
        chosen = { id: t.id };
        break;
      }
    }

    const ul = await this.getOrCreateUserLoyalty(userId);
    const oldTierId = ul.tierId || null;
    const newTierId = chosen?.id || null;
    if (oldTierId === newTierId)
      return { status: true, message: 'Tier unchanged' };

    await this.prisma.$transaction(async (tx) => {
      await tx.userLoyalty.update({
        where: { userId },
        data: { tierId: newTierId },
      });
      await tx.tierHistory.create({
        data: { userId, oldTierId, newTierId, reason: 'recalculated' },
      });
    });

    return {
      status: true,
      message: 'Tier updated',
      from: oldTierId,
      to: newTierId,
    };
  }

  async expireJob(limit = 500) {
    const now = new Date();
    // fetch expiring ACTIVE batches
    const batches = await this.prisma.rewardPoints.findMany({
      where: { status: RewardPointStatus.ACTIVE, expiresAt: { lte: now } },
      orderBy: { expiresAt: 'asc' },
      take: limit,
    });
    if (!batches.length)
      return { status: true, message: 'No batches to expire' };

    // decrement per user
    const byUser = new Map<string, number>();
    for (const b of batches) {
      if (b.remaining > 0)
        byUser.set(b.userId, (byUser.get(b.userId) || 0) + b.remaining);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const b of batches) {
        await tx.rewardPoints.update({
          where: { id: b.id },
          data: { remaining: 0, status: RewardPointStatus.EXPIRED },
        });
      }
      for (const [userId, dec] of byUser) {
        await tx.userLoyalty.update({
          where: { userId },
          data: { currentPoints: { decrement: dec } },
        });
      }
    });

    return { status: true, expired: batches.length };
  }
}
