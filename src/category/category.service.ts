import {
  Injectable,
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateCategoryDto, createCategorySchema } from './dto/category.dto';
import { queryCategorySchema } from './dto/query.dto';
import { updateCategoryDto, updateCategorySchema } from './dto/update.dto';

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

    if (data.slug) {
      const existsSlug = await this.prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (existsSlug && existsSlug.id !== id) {
        throw new NotAcceptableException('Slug already exists');
      }
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new NotAcceptableException('Category cannot be its own parent');
      }
      const parentCategory = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });
      if (!parentCategory) {
        throw new NotAcceptableException('Parent category not found');
      }
    }

    const update = await this.prisma.category.update({
      where: { id },
      data: {
        name: parsebody.data.name,
        icon: data.icon,
        status: parsebody.data.status,
        parentId: parsebody.data.parentId,
        slug: data.slug ? data.slug : category.slug,
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

    return {
      status: true,
      data: data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  //find single category with children
  async findSingleCategoryBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return { status: true, data: category };
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
}
