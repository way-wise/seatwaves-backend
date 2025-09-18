import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateHelpDto } from './dto/create.dto';
import { UpdateHelpDto, updateHelpSchema } from './dto/update.dto';
import {
  HelpQueryDto,
  helpQuerySchema,
  PaginatedHelpFaqResponse,
} from './dto/query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HelpService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all help FAQs with advanced filtering, search, and cursor pagination
   */
  async findAll(query: HelpQueryDto) {
    const parseQuery = helpQuerySchema.parse(query);
    const {
      cursor,
      limit = '20',
      search,
      type,
      status,
      blogId,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      sortBy,
      sortOrder,
      includeDeleted,
    } = parseQuery;

    // Build where clause
    const where: Prisma.HelpFaqWhereInput = {
      // Soft delete filter
      deletedAt: includeDeleted ? undefined : null,
    };

    // Search functionality
    if (search) {
      where.OR = [
        {
          question: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          answer: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Type filter
    if (type) {
      where.type = type;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Blog ID filter
    if (blogId) {
      where.blogId = blogId;
    }

    // Date range filters
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) {
        where.createdAt.gte = new Date(createdAfter);
      }
      if (createdBefore) {
        where.createdAt.lte = new Date(createdBefore);
      }
    }

    if (updatedAfter || updatedBefore) {
      where.updatedAt = {};
      if (updatedAfter) {
        where.updatedAt.gte = new Date(updatedAfter);
      }
      if (updatedBefore) {
        where.updatedAt.lte = new Date(updatedBefore);
      }
    }

    // Build orderBy
    const orderBy: Prisma.HelpFaqOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Cursor pagination setup
    const take = Number(limit) + 1; // Get one extra to check if there's a next page
    const cursorObj = cursor ? { id: cursor } : undefined;

    try {
      // Execute query
      const results = await this.prisma.helpFaq.findMany({
        where,
        orderBy,
        take,
        cursor: cursorObj,
        skip: cursor ? 1 : 0, // Skip the cursor item itself
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });

      // Check if there are more results
      const hasNext = results.length > Number(limit);
      const data = hasNext ? results.slice(0, -1) : results;

      // Get previous cursor (first item's ID)
      const hasPrev = !!cursor;
      const nextCursor = hasNext ? data[data.length - 1]?.id : undefined;
      const prevCursor = hasPrev ? data[0]?.id : undefined;

      // Get total count for better UX (optional, can be expensive)
      const totalCount = await this.prisma.helpFaq.count({ where });

      return {
        data,
        pagination: {
          hasNext,
          hasPrev,
          nextCursor,
          prevCursor,
          totalCount,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch help FAQs: ' + error.message,
      );
    }
  }

  /**
   * Find all help FAQs for admin
   */
  async findAllAdmin(query: HelpQueryDto) {
    const parsed = helpQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }

    const {
      cursor,
      limit = '20',
      search,
      type,
      status,
      blogId,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore,
      sortBy,
      sortOrder,
      includeDeleted,
    } = parsed.data;

    // Admin can opt to include soft-deleted items via includeDeleted
    const where: Prisma.HelpFaqWhereInput = {
      deletedAt: includeDeleted ? undefined : null,
    };

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) where.type = type;
    if (status) where.status = status;
    if (blogId) where.blogId = blogId;

    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = new Date(createdAfter);
      if (createdBefore) where.createdAt.lte = new Date(createdBefore);
    }

    if (updatedAfter || updatedBefore) {
      where.updatedAt = {};
      if (updatedAfter) where.updatedAt.gte = new Date(updatedAfter);
      if (updatedBefore) where.updatedAt.lte = new Date(updatedBefore);
    }

    const orderBy: Prisma.HelpFaqOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const take = Number(limit) + 1;
    const cursorObj = cursor ? { id: cursor } : undefined;

    try {
      const results = await this.prisma.helpFaq.findMany({
        where,
        orderBy,
        take,
        cursor: cursorObj,
        skip: cursor ? 1 : 0,
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });

      const hasNext = results.length > Number(limit);
      const data = hasNext ? results.slice(0, -1) : results;
      const hasPrev = !!cursor;
      const nextCursor = hasNext ? data[data.length - 1]?.id : undefined;
      const prevCursor = hasPrev ? data[0]?.id : undefined;

      const totalCount = await this.prisma.helpFaq.count({ where });

      return {
        data,
        pagination: {
          hasNext,
          hasPrev,
          nextCursor,
          prevCursor,
          totalCount,
        },
      } as PaginatedHelpFaqResponse;
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch admin help FAQs: ' + error.message,
      );
    }
  }

  /**
   * Find a single help FAQ by ID
   */
  async findOne(id: string) {
    try {
      const helpFaq = await this.prisma.helpFaq.findFirst({
        where: {
          id,
          deletedAt: null, // Exclude soft deleted
        },
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
              content: true,
            },
          },
        },
      });

      if (!helpFaq) {
        throw new NotFoundException(`Help FAQ with ID ${id} not found`);
      }

      return helpFaq;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch help FAQ: ' + error.message,
      );
    }
  }

  /**
   * Create a new help FAQ
   */
  async create(data: CreateHelpDto) {
    try {
      // Validate blog exists if blogId is provided
      if (data.blogId) {
        const blog = await this.prisma.blog.findUnique({
          where: { id: data.blogId },
        });
        if (!blog) {
          throw new BadRequestException('Blog not found');
        }
      }

      return await this.prisma.helpFaq.create({
        data,
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create help FAQ: ' + error.message,
      );
    }
  }

  /**
   * Update a help FAQ
   */
  async update(id: string, data: UpdateHelpDto) {
    try {
      const parsed = updateHelpSchema.safeParse(data);
      if (!parsed.success) {
        throw new BadRequestException(parsed.error.message);
      }
      // Check if FAQ exists and is not soft deleted
      const existingFaq = await this.prisma.helpFaq.findFirst({
        where: {
          id,
        },
      });

      if (!existingFaq) {
        throw new NotFoundException(`Help FAQ with ID ${id} not found`);
      }

      // Validate blog exists if blogId is provided
      if (data.blogId) {
        const blog = await this.prisma.blog.findUnique({
          where: { id: data.blogId },
        });
        if (!blog) {
          throw new BadRequestException('Blog not found');
        }
      }

      return await this.prisma.helpFaq.update({
        where: { id },
        data: parsed.data,
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update help FAQ: ' + error.message,
      );
    }
  }

  /**
   * Soft delete a help FAQ
   */
  async remove(id: string) {
    const deleted = await this.prisma.helpFaq.delete({
      where: { id },
    });
    return {
      status: true,
      message: 'Help FAQ deleted successfully',
      deleted,
    };
  }

  /**
   * Permanently delete a help FAQ (hard delete)
   */
  async hardDelete(id: string) {
    try {
      const existingFaq = await this.prisma.helpFaq.findUnique({
        where: { id },
      });

      if (!existingFaq) {
        throw new NotFoundException(`Help FAQ with ID ${id} not found`);
      }

      const deleted = await this.prisma.helpFaq.delete({
        where: { id },
      });
      return {
        status: true,
        message: 'Help FAQ permanently deleted successfully',
        deleted,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to permanently delete help FAQ: ' + error.message,
      );
    }
  }

  /**
   * Restore a soft deleted help FAQ
   */
  async restore(id: string) {
    try {
      const existingFaq = await this.prisma.helpFaq.findFirst({
        where: {
          id,
          deletedAt: { not: null },
        },
      });

      if (!existingFaq) {
        throw new NotFoundException(`Deleted help FAQ with ID ${id} not found`);
      }

      return await this.prisma.helpFaq.update({
        where: { id },
        data: {
          deletedAt: null,
        },
        include: {
          blog: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to restore help FAQ: ' + error.message,
      );
    }
  }

  /**
   * Bulk update help FAQ status
   */
  async bulkUpdateStatus(
    ids: string[],
    status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED',
  ) {
    try {
      const result = await this.prisma.helpFaq.updateMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        data: {
          status,
          updatedAt: new Date(),
        },
      });

      return {
        updated: result.count,
        status,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to bulk update status: ' + error.message,
      );
    }
  }

  /**
   * Get help FAQ statistics
   */
  async getStats() {
    try {
      const [total, byStatus, byType, recentlyCreated] = await Promise.all([
        // Total count
        this.prisma.helpFaq.count({
          where: { deletedAt: null },
        }),

        // Count by status
        this.prisma.helpFaq.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: true,
        }),

        // Count by type
        this.prisma.helpFaq.groupBy({
          by: ['type'],
          where: { deletedAt: null },
          _count: true,
        }),

        // Recently created (last 7 days)
        this.prisma.helpFaq.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        total,
        byStatus: byStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byType: byType.reduce(
          (acc, item) => {
            acc[item.type] = item._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        recentlyCreated,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to get statistics: ' + error.message,
      );
    }
  }
}
