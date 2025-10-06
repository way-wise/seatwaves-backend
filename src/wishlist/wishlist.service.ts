// src/wishlist/wishlist.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginationQuerySchema } from 'src/message/dto/pagination.dto';
import { WishlistQuerySchema } from './dto/query.dto';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: any) {
    if (!userId) return { status: false, message: 'User not found' };

    const parseQuery = WishlistQuerySchema.safeParse(query);

    if (!parseQuery.success) {
      throw new BadRequestException(parseQuery.error.errors);
    }

    const {
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      cursor,
    } = parseQuery.data;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.wishlistItem.findMany({
        where: { userId },
        orderBy: { [sortBy]: sortOrder },
        skip: Number(skip),
        take: Number(limit),
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          createdAt: true,
          userId: true,
          eventId: true,
          event: true,
        },
      }),
      this.prisma.wishlistItem.count({ where: { userId } }),
    ]);

    const hasNext = total > parseInt(page) * parseInt(limit);
    const hasPrev = parseInt(page) > 1;

    return {
      status: true,
      data: data,
      cursor: data[data.length - 1]?.id,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext,
      hasPrev,
    };
  }

  //with cursor pagination
  async findAllApp(userId: string, query: any) {
    const parseQuery = paginationQuerySchema.safeParse(query);

    if (!parseQuery.success) {
      throw new BadRequestException(parseQuery.error.errors);
    }
    const {
      cursor,
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = parseQuery.data;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.wishlistItem.findMany({
        where: { userId },
        orderBy: { [sortBy]: sortOrder },
        take: Number(limit),
        cursor: cursor ? { id: cursor } : undefined,
        select: {
          id: true,
          createdAt: true,
          userId: true,
          eventId: true,
          event: true,
        },
      }),
      this.prisma.wishlistItem.count({ where: { userId } }),
    ]);

    return {
      status: true,
      data: data,
      cursor: data[data.length - 1]?.id,
      total: total,
    };
  }

  async addItem(eventId: string, userId: string) {
    //check if experience exists
    const experience = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!experience) {
      return { status: false, message: 'Experience not found' };
    }
    //check if user has already added this experience
    const exists = await this.prisma.wishlistItem.findFirst({
      where: {
        AND: [{ userId: userId }, { eventId: eventId }],
      },
    });

    if (exists) {
      throw new BadRequestException('Item already exists in wishlist');
    }

    const wishlist = await this.prisma.wishlistItem.create({
      data: {
        userId: userId,
        eventId: eventId,
      },
    });
    return { status: true, data: wishlist };
  }

  async removeItem(userId: string, eventId: string) {
    //check if user has already added this experience

    const wishlist = await this.prisma.wishlistItem.deleteMany({
      where: { AND: [{ userId: userId }, { eventId: eventId }] },
    });

    if (wishlist.count === 0) {
      return { status: false, message: 'Item not found in wishlist' };
    }

    return {
      status: true,
      message: 'Item removed from wishlist',
      data: wishlist,
    };
  }

  async clear(userId: string) {
    const wishlist = await this.prisma.wishlistItem.deleteMany({
      where: { userId },
    });
    return { status: true, message: 'Wishlist cleared', data: wishlist };
  }
}
