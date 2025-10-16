import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ReviewQueryByHost } from './dto/query.dto';
import { createReviewDto } from './dto/review.dto';
import { CreateReviewReplyDto } from './dto/reviewReply.dto';
import { StatusDto, statusSchema } from './dto/status.dto';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: createReviewDto, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: {
        id: true,
        userId: true,
        ticket: {
          select: {
            event: true,
          },
        },
      },
    });

    if (!booking || !booking.ticket?.event) {
      throw new NotAcceptableException("You can't provide review");
    }

    if (userId !== booking.userId) {
      throw new NotAcceptableException("You can't provide review");
    }

    //check already reviewed or not by this user for this experience
    const alreadyReviewed = await this.prisma.review.findFirst({
      where: {
        AND: [
          { eventId: booking.ticket.event.id },
          { reviewerId: booking.userId },
        ],
      },
    });

    if (alreadyReviewed) {
      throw new NotAcceptableException(
        'You have already reviewed this booking.',
      );
    }

    await this.prisma.review.create({
      data: {
        title: data.title,
        comment: data.comment,
        rating: data.rating,
        eventId: booking.ticket.event.id,
        reviewerId: booking.userId,
        revieweeId: booking.ticket.event.sellerId,
      },
    });

    //Calculate Average Rating then update experience
    const reviews = await this.prisma.review.findMany({
      where: {
        eventId: booking.ticket.event.id,
      },
      select: {
        rating: true,
      },
    });

    const averageRating =
      reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    //TODO: update event average rating

    // await this.prisma.event.update({
    //   where: { id: booking.seat.event.id },
    //   data: { averageRating },
    // });
    await this.prisma.user.update({
      where: { id: booking.ticket.event.sellerId },
      data: { averageRating },
    });

    return {
      status: true,
      message: 'Your Review successfully added',
    };
  }

  async updateStatus(id: string, body: StatusDto, userId: string) {
    const parseBody = statusSchema.safeParse(body);
    if (!parseBody.success) {
      throw new BadRequestException(parseBody.error.errors);
    }

    const review = await this.prisma.review.findUnique({
      where: { id: id },
      select: {
        id: true,
        status: true,
        revieweeId: true,
      },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.revieweeId !== userId) {
      throw new BadRequestException(
        'You are not allowed to update this review',
      );
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: id },
      data: {
        status: parseBody.data.status,
      },
    });
    return {
      status: true,
      message: 'Review status updated',
      data: updatedReview,
    };
  }

  async findAll(query: ReviewQueryByHost) {
    const {
      search,
      rating,
      status,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};

    // Filter by rating
    if (rating) {
      where.rating = { gte: rating };
    }

    // Filter by status
    if (status) {
      where.status = status.toUpperCase();
    }

    // Search by reviewer name or experience name
    if (search) {
      where.OR = [
        {
          reviewer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          booking: {
            eventInstance: {
              event: {
                experience: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: skip,
        take: parseInt(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      status: true,
      data: reviews,
      total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / parseInt(limit)),
      next: skip + parseInt(limit) < total,
      prev: skip > 0,
    };
  }

  // experience all reviews
  async findAllByExperience(experienceId: string, query: ReviewQueryByHost) {
    const {
      search,
      rating,
      status,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      experienceId: experienceId,
    };

    // Filter by rating
    if (rating) {
      where.rating = { gte: rating };
    }

    // Filter by status
    if (status) {
      where.status = status.toUpperCase();
    }

    // Search by reviewer name or experience name
    if (search) {
      where.OR = [
        {
          reviewer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          booking: {
            eventInstance: {
              event: {
                experience: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: skip,
        take: parseInt(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      status: true,
      data: reviews,
      total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / parseInt(limit)),
      next: skip + parseInt(limit) < total,
      prev: skip > 0,
    };
  }

  async findAllByHost(hostId: string, query: ReviewQueryByHost) {
    const {
      search,
      rating,
      status,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      revieweeId: hostId,
    };

    // Filter by rating
    if (rating) {
      where.rating = { gte: rating };
    }

    // Filter by status
    if (status) {
      where.status = status.toUpperCase();
    }

    // Search by reviewer name or experience name
    if (search) {
      where.OR = [
        {
          reviewer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          booking: {
            eventInstance: {
              event: {
                experience: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: skip,
        take: parseInt(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      status: true,
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async findAllByEvent(eventId: string, query: ReviewQueryByHost) {
    const {
      search,
      rating,
      status,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      eventId,
    };

    // Filter by rating
    if (rating) {
      where.rating = { gte: rating };
    }

    // Filter by status
    if (status) {
      where.status = status.toUpperCase();
    }

    // Search by reviewer name or experience name
    if (search) {
      where.OR = [
        {
          reviewer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          booking: {
            eventInstance: {
              event: {
                experience: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: skip,
        take: parseInt(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      status: true,
      data: reviews,
      total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / parseInt(limit)),
      next: skip + parseInt(limit) < total,
      prev: skip > 0,
    };
  }
  async findAllPending(hostId: string, query: ReviewQueryByHost) {
    const {
      search,
      rating,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {
      status: 'PENDING',
      revieweeId: hostId,
    };

    // Filter by rating
    if (rating) {
      where.rating = { gte: rating };
    }

    // Search by reviewer name or experience name
    if (search) {
      where.OR = [
        {
          reviewer: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          booking: {
            eventInstance: {
              event: {
                experience: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [reviews, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        skip: skip,
        take: parseInt(limit),
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          reviewer: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      status: true,
      data: reviews,
      total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(total / parseInt(limit)),
      next: skip + parseInt(limit) < total,
      prev: skip > 0,
    };
  }

  //Reply Review
  async reply(data: CreateReviewReplyDto, userId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id: data.reviewId },
      select: {
        id: true,
        status: true,
        revieweeId: true,
        replyed: true,
      },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.revieweeId !== userId) {
      throw new BadRequestException('You are not allowed to reply this review');
    }

    // Already replied
    if (review.replyed) {
      throw new BadRequestException('Review already replied');
    }

    const reply = await this.prisma.review.update({
      where: { id: data.reviewId },
      data: { replyed: data.reply, repliedAt: new Date() },
    });

    return {
      status: true,
      data: reply,
      message: 'Reply successfully',
    };
  }

  //
  async getReviwStats(experienceId: string) {
    const where: any = { experienceId };

    const [aggregate, grouped] = await this.prisma.$transaction([
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _sum: { rating: true },
        _count: true,
      }),
      this.prisma.review.groupBy({
        where,
        by: ['rating'],
        orderBy: { rating: 'asc' },
        _count: { rating: true },
      }),
    ]);

    const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    grouped.forEach((g: any) => {
      const r = Number(g.rating);
      if (r >= 1 && r <= 5) {
        starCounts[r] = g._count?.rating ?? 0;
      }
    });

    const total = (aggregate as any)._count ?? 0;
    const totalRating = (aggregate as any)._sum?.rating ?? 0;
    const avg = (aggregate as any)._avg?.rating ?? 0;

    return {
      status: true,
      data: {
        averageRating: Number((avg || 0).toFixed(2)),
        totalRating: Number(totalRating || 0),
        total: Number(total || 0),
        oneStar: starCounts[1],
        twoStar: starCounts[2],
        threeStar: starCounts[3],
        fourStar: starCounts[4],
        fiveStar: starCounts[5],
      },
    };
  }
}
