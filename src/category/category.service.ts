import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto, createCategorySchema } from './dto/category.dto';
import { updateCategoryDto, updateCategorySchema } from './dto/update.dto';
import { UploadService } from 'src/upload/upload.service';
import { queryCategorySchema } from './dto/query.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}
  private readonly logger = new Logger(CategoryService.name);

  async create(data: CreateCategoryDto, file?: Express.Multer.File) {
    const parsebody = createCategorySchema.safeParse(data);

    if (!parsebody.success) {
      throw new NotAcceptableException(parsebody.error.errors);
    }

    const exists = await this.prisma.category.findUnique({
      where: { name: parsebody.data.name },
    });

    if (exists) {
      throw new NotAcceptableException('Category already exists');
    }

    // ⬇️ handle the uploaded icon
    if (file) {
      const uploadResult = await this.uploadService.uploadFile(
        file,
        'categories',
      );
      data.icon = uploadResult.Key; // or `uploadResult.Location` if S3
    }

    const slug = parsebody.data.slug
      ? parsebody.data.slug
      : parsebody.data.name.substring(0, 30).toLowerCase().replace(/\s/g, '-');

    const existsSlug = await this.prisma.category.findUnique({
      where: { slug },
    });

    if (existsSlug) {
      throw new NotAcceptableException('Slug already exists');
    }

    const category = await this.prisma.category.create({
      data: { ...data, slug },
    });

    this.logger.log(`Created category with id: ${category.id}`);

    return {
      status: true,
      data: category,
      message: 'Category created successfully.',
    };
  }

  //Update
  async categoryUpdate(
    id: string,
    data: updateCategoryDto,
    file?: Express.Multer.File,
  ) {
    const parsebody = updateCategorySchema.safeParse(data);

    if (!parsebody.success) {
      throw new NotAcceptableException(parsebody.error.errors);
    }

    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (data.name) {
      const exists = await this.prisma.category.findUnique({
        where: { name: parsebody.data.name },
      });
      if (exists && exists.id !== id) {
        throw new NotAcceptableException('Category already exists');
      }
    }

    if (file && category.icon) {
      await this.uploadService.deleteFile(category.icon);
    }

    if (file) {
      const uploadResult = await this.uploadService.uploadFile(
        file,
        'categories',
      );
      data.icon = uploadResult.Key; // or `uploadResult.Location` if S3
    }

    const update = await this.prisma.category.update({
      where: { id },
      data: {
        name: parsebody.data.name,
        icon: data.icon,
        status: parsebody.data.status,
      },
    });
    this.logger.log(`Updated category with id: ${category.id}`);
    return {
      status: true,
      data: update,
      message: 'Category updated successfully.',
    };
  }

  //get experiences by category id or slug
  async getExperiencesByCategory(id: string) {
    try {
      // Try to find category by ID first, then by slug if not found
      let category = await this.prisma.category.findUnique({
        where: { id },
        select: { id: true, name: true, slug: true, icon: true },
      });

      if (!category) {
        // Try finding by slug if ID lookup failed
        category = await this.prisma.category.findUnique({
          where: { slug: id },
          select: { id: true, name: true, slug: true, icon: true },
        });
      }

      if (!category) {
        throw new NotFoundException('Category not found.');
      }

      // Get experiences with comprehensive data
      const experiences = await this.prisma.experience.findMany({
        where: {
          categoryId: category.id,
          status: 'PUBLISHED', // Only return published experiences
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              stripeOnboardingComplete: true,
            },
          },
          amenities: {
            select: {
              id: true,
              amenity: {
                select: { id: true, name: true, icon: true },
              },
            },
          },
          media: {
            select: { id: true, url: true },
            orderBy: { uploadedAt: 'asc' },
          },
          events: {
            where: {
              date: { gte: new Date() }, // Only future events
              status: 'SCHEDULE',
            },
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              maxGuest: true,
              price: true,
            },
            orderBy: { date: 'asc' },
            take: 10, // Limit to next 10 events
          },
          _count: {
            select: {
              reviews: true,
              events: {
                where: {
                  date: { gte: new Date() },
                  status: 'SCHEDULE',
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Calculate average rating for each experience
      const experiencesWithRatings = await Promise.all(
        experiences.map(async (experience) => {
          const ratingData = await this.prisma.review.aggregate({
            where: { experienceId: experience.id },
            _avg: { rating: true },
            _count: { rating: true },
          });

          return {
            ...experience,
            averageRating: ratingData._avg.rating || 0,
            totalReviews: ratingData._count.rating || 0,
            hasUpcomingEvents: experience.events.length > 0,
            nextEventDate: experience.events[0]?.date || null,
            startingPrice:
              experience.events.length > 0
                ? Math.min(...experience.events.map((e) => Number(e.price)))
                : null,
          };
        }),
      );

      this.logger.log(
        `Retrieved ${experiences.length} experiences for category: ${category.name}`,
      );

      return {
        status: true,
        data: {
          category,
          experiences: experiencesWithRatings,
          totalCount: experiences.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting experiences for category ${id}:`, error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve experiences for category',
      );
    }
  }

  async findByAdmin(query: any) {
    const parsebody = queryCategorySchema.safeParse(query);

    if (!parsebody.success) {
      throw new NotAcceptableException(parsebody.error.errors);
    }

    const {
      search,
      limit = '10',
      page = '1',
      sortBy,
      sortOrder,
    } = parsebody.data;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        where,
        skip: Number(skip),
        take: Number(limit),
        orderBy: { [sortBy as string]: sortOrder },
      }),
      this.prisma.category.count({ where }),
    ]);

    const hasNext = skip + parseInt(limit) < total;
    const hasPrev = skip > 0;
    return {
      status: true,
      data: data,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNext,
      hasPrev,
    };
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        createdAt: true,
      },
    });
    return { status: true, data: categories };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return { status: true, data: category };
  }

  //not used category remove
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { experiences: { select: { id: true } } },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (category.experiences.length > 0) {
      throw new NotAcceptableException(
        'Category already in use in experience ',
      );
    }

    if (category.icon) {
      await this.uploadService.deleteFile(category.icon);
    }
    await this.prisma.category.delete({ where: { id } });
    return { status: true, message: 'Category removed successfully.' };
  }
}
