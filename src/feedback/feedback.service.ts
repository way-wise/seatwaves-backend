import { Injectable, NotAcceptableException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create.dto';
import { queryFeedbackSchema } from './dto/query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async createFeedback(feedbackDto: CreateFeedbackDto) {
    const feedback = await this.prisma.feedBack.create({
      data: feedbackDto,
    });
    return {
      status: true,
      message: 'Feedback added successfully',
      data: feedback,
    };
  }

  async getAllFeedback(query: any) {
    const parseQuery = queryFeedbackSchema.safeParse(query);

    if (!parseQuery.success) {
      throw new NotAcceptableException(parseQuery.error.errors);
    }

    const {
      limit = '10',
      page = '1',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      platform,
    } = parseQuery.data;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;
    const orderBy = { [sortBy]: sortOrder };

    const where: Prisma.FeedBackWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (platform) {
      where.platform = platform;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feedBack.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          name: true,
          message: true,
          platform: true,
          createdAt: true,
        },
      }),
      this.prisma.feedBack.count({ where }),
    ]);

    return {
      status: true,
      data: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limitNum),
        next: skip + limitNum < total,
        prev: pageNum > 1,
      },
    };
  }
}
