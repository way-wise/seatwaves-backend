import {
  BadRequestException,
  Injectable,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateBlogDto, CreateBlogSchema } from './dto/createBlog.dto';
import { BlogStatus, Prisma } from '@prisma/client';
import { UpdateBlogDto, updateBlogSchema } from './dto/updateBlog.dto';
import { blogQuerySchema } from './dto/query.dto';
import { publicQuerySchema } from './dto/publicQuery.dto';

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async createBlog(data: CreateBlogDto, file?: Express.Multer.File) {
    const parseData = CreateBlogSchema.safeParse(data);

    if (!parseData.success) {
      throw new BadRequestException(parseData.error);
    }

    // Ensure authorId is present (should come from authenticated context)
    if (!parseData.data.authorId) {
      throw new BadRequestException('authorId is required');
    }

    // Handle file upload first and keep the final key in a local variable
    let finalCoverImage: string | null = parseData.data.coverImage ?? null;
    if (file) {
      const uploadResult = await this.uploadService.uploadFile(file, 'blogs');
      finalCoverImage = uploadResult.Key;
    }

    const {
      title,
      authorId,
      content,
      slug,
      categories,
      tags,
      excerpt,
      metaTitle,
      metaDescription,
      ogTitle,
      ogDescription,
      metaKeywords,
      robotsFollow,
      robotsIndex,
      status,
      publishedAt,
      isFeatured,
    } = parseData.data;

    const existsSlug = await this.prisma.blog.findFirst({
      where: { slug: data.slug },
    });

    if (existsSlug) {
      throw new BadRequestException('Slug already exists');
    }

    const blog = await this.prisma.blog.create({
      data: {
        ...{
          title: title,
          slug: slug,
          content: content,
          coverImage: finalCoverImage || undefined,
          excerpt: excerpt,
          status: status,
          publishedAt: publishedAt,
          isFeatured: isFeatured,
          isDeleted: false,
        },
        seo: {
          create: {
            metaTitle: metaTitle || '',
            metaDescription: metaDescription || '',
            ogImage: finalCoverImage || '',
            ogTitle: ogTitle || title || '',
            ogDescription: ogDescription || '',
            ogType: 'article',
            metaKeywords: metaKeywords || '',
            robotsFollow: robotsFollow ?? true,
            robotsIndex: robotsIndex ?? true,
          },
        },
        author: { connect: { id: authorId } },
        tags: tags ? { connect: tags.map((id) => ({ id })) } : undefined,
        categories: categories
          ? { connect: categories.map((id) => ({ id })) }
          : undefined,
      },
    });
    return { status: true, data: blog };
  }

  async updateBlog(
    id: string,
    data: UpdateBlogDto,
    file?: Express.Multer.File,
  ) {
    const parseData = updateBlogSchema.safeParse(data);

    if (!parseData.success) {
      throw new BadRequestException(parseData.error);
    }
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException('Blog not found');

    if (file) {
      if (blog.coverImage) {
        await this.uploadService.deleteFile(blog.coverImage);
      }
      const uploadResult = await this.uploadService.uploadFile(file, 'blogs');
      parseData.data.coverImage = uploadResult.Key;
    }

    if (data.slug) {
      const existsSlug = await this.prisma.blog.findFirst({
        where: {
          slug: data.slug,
          NOT: { id },
        },
      });
      if (existsSlug) {
        throw new BadRequestException('Slug already in use');
      }
    }

    return await this.prisma.blog.update({
      where: { id },
      data: {
        title: parseData.data.title,
        slug: parseData.data.slug,
        content: parseData.data.content,
        coverImage: parseData.data.coverImage,
        excerpt: parseData.data.excerpt,
        status: parseData.data.status,
        publishedAt: parseData.data.publishedAt,
        isFeatured: parseData.data.isFeatured,
        seo: {
          upsert: {
            update: {
              metaTitle: parseData.data.metaTitle || '',
              metaDescription: parseData.data.metaDescription || '',
              ogImage: parseData.data.coverImage || '',
              ogTitle:
                parseData.data.ogTitle ||
                parseData.data.title ||
                blog.title ||
                '',
              ogDescription: parseData.data.ogDescription || '',
              ogType: 'article',
              metaKeywords: parseData.data.metaKeywords || '',
              robotsFollow: parseData.data.robotsFollow ?? true,
              robotsIndex: parseData.data.robotsIndex ?? true,
            },
            create: {
              metaTitle: parseData.data.metaTitle || blog.title || '',
              metaDescription: parseData.data.metaDescription || '',
              ogImage: parseData.data.coverImage || blog.coverImage || '',
              ogTitle:
                parseData.data.ogTitle ||
                parseData.data.title ||
                blog.title ||
                '',
              ogDescription: parseData.data.ogDescription || '',
              ogType: 'article',
              metaKeywords: parseData.data.metaKeywords || '',
              robotsFollow: parseData.data.robotsFollow ?? true,
              robotsIndex: parseData.data.robotsIndex ?? true,
            },
          },
        },
        tags: parseData.data.tags
          ? { set: parseData.data.tags.map((id) => ({ id })) }
          : undefined,
        categories: parseData.data.categories
          ? { set: parseData.data.categories.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async getBlogById(id: string) {
    const blog = await this.prisma.blog.findFirst({
      where: {
        id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            _count: { select: { blogs: true } },
          },
        },
        seo: true,
        tags: true,
        categories: true,
      },
    });

    if (!blog) throw new NotFoundException('Blog not found');

    return blog;
  }

  async deleteBlog(id: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) throw new NotFoundException('Blog not found');
    await this.prisma.blog.delete({ where: { id } });
    return {
      status: true,
      message: 'Blog deleted successfully',
    };
  }

  async getBlogByIdOrSlug(identifier: string) {
    const [data, setting] = await this.prisma.$transaction([
      this.prisma.blog.findFirst({
        where: {
          OR: [{ id: identifier }, { slug: identifier }],
          isDeleted: false,
          status: 'PUBLISHED',
          // publishedAt: { lte: new Date() },
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              _count: { select: { blogs: true } },
            },
          },
          seo: true,
          tags: true,
          categories: true,
        },
      }),
      this.prisma.settings.findFirst(),
    ]);

    return { status: true, data, setting };
  }

  async getAllAdminBlogs(query: any) {
    const parseQuery = blogQuerySchema.safeParse(query);

    if (!parseQuery.success) {
      throw new NotAcceptableException(parseQuery.error.errors);
    }

    const {
      search,
      status,
      isFeatured,
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
    } = parseQuery.data;

    let where: Prisma.BlogWhereInput = {};
    if (search) {
      where = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      };
    }
    if (status) {
      if (typeof status === 'string') {
        const parts = status.split('.').filter(Boolean);
        if (parts.length > 1) {
          // multiple statuses
          (where as any).status = { in: parts };
        } else {
          // single status in string form
          (where as any).status = parts[0];
        }
      } else {
        where.status = status;
      }
    }

    if (isFeatured) {
      where.isFeatured = isFeatured;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;
    const orderBy = { [sortBy]: sortOrder };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.blog.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          createdAt: true,
          status: true,
          isFeatured: true,
          publishedAt: true,
        },
      }),
      this.prisma.blog.count({ where }),
    ]);
    return {
      status: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        total,
      },
    };
  }

  async getAllBlogs(query?: {
    status?: BlogStatus;
    isFeatured?: boolean;
    search?: string;
  }) {
    const { status, isFeatured, search } = query || {};
    return await this.prisma.blog.findMany({
      where: {
        isDeleted: false,
        status,
        isFeatured,
        OR: search
          ? [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        createdAt: true,
        status: true,
        isFeatured: true,
        publishedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            _count: { select: { blogs: true } },
          },
        },
        tags: true,
        categories: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPublicBlogs(query: any) {
    const parseQuery = publicQuerySchema.safeParse(query);
    if (!parseQuery.success) {
      throw new NotAcceptableException(parseQuery.error.errors);
    }
    const {
      limit = '10',
      page = '1',
      cursor,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
      search,
    } = parseQuery.data;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const orderBy: any = [
      { [sortBy]: sortOrder },
      // add tiebreaker for deterministic ordering
      { id: sortOrder as 'asc' | 'desc' },
    ];

    const baseWhere: Prisma.BlogWhereInput = {
      status: 'PUBLISHED',
      isDeleted: false,
      // publishedAt: { lte: new Date() },
    };

    const searchWhere: Prisma.BlogWhereInput | undefined = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    let whereAnd: Prisma.BlogWhereInput[] = [baseWhere];
    if (searchWhere) whereAnd.push(searchWhere);

    // If cursor provided, use keyset pagination; otherwise, fallback to page-based
    let data;
    let total = 0;

    if (cursor) {
      // decode cursor: base64 -> json { publishedAt: string, id: string }
      let cursorObj: { publishedAt: string; id: string } | null = null;
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        cursorObj = JSON.parse(decoded);
      } catch (e) {
        throw new BadRequestException('Invalid cursor');
      }

      if (!cursorObj || !cursorObj.id || !cursorObj.publishedAt) {
        throw new BadRequestException('Invalid cursor');
      }

      const cursorDate = new Date(cursorObj.publishedAt);
      // apply keyset where based on sortOrder and combine with existing filters using AND
      const cursorWhere: Prisma.BlogWhereInput =
        sortOrder === 'desc'
          ? {
              OR: [
                { publishedAt: { lt: cursorDate } },
                {
                  AND: [
                    { publishedAt: cursorDate },
                    { id: { lt: cursorObj.id } },
                  ],
                },
              ],
            }
          : {
              OR: [
                { publishedAt: { gt: cursorDate } },
                {
                  AND: [
                    { publishedAt: cursorDate },
                    { id: { gt: cursorObj.id } },
                  ],
                },
              ],
            };

      whereAnd.push(cursorWhere);

      data = await this.prisma.blog.findMany({
        where: { AND: whereAnd },
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          createdAt: true,
          status: true,
          isFeatured: true,
          publishedAt: true,
          excerpt: true,
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
              _count: { select: { blogs: true } },
            },
          },
          tags: true,
          categories: true,
        },
        orderBy,
        take: limitNum,
      });
    } else {
      const skip = (pageNum - 1) * limitNum;
      const take = limitNum;
      const result = await this.prisma.$transaction([
        this.prisma.blog.findMany({
          where: { AND: whereAnd },
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            createdAt: true,
            status: true,
            isFeatured: true,
            publishedAt: true,
            excerpt: true,
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
                _count: { select: { blogs: true } },
              },
            },
            tags: true,
            categories: true,
          },
          orderBy,
          skip,
          take,
        }),
        this.prisma.blog.count({ where: { AND: whereAnd } }),
      ]);
      data = result[0];
      total = result[1] as number;
    }

    const nextCursor =
      data && data.length === limitNum
        ? Buffer.from(
            JSON.stringify({
              id: data[data.length - 1].id,
              publishedAt: data[data.length - 1].publishedAt,
            }),
          ).toString('base64')
        : null;

    const response: any = {
      status: true,
      data,
      nextCursor,
    };

    if (!cursor) {
      response.pagination = {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };
    }

    return response;
  }

  async toggleFeature(id: string, isFeatured: boolean) {
    return await this.prisma.blog.update({
      where: { id },
      data: { isFeatured },
    });
  }

  async publishBlog(id: string) {
    return await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async unpublishBlog(id: string) {
    return await this.prisma.blog.update({
      where: { id },
      data: {
        status: BlogStatus.DRAFT,
        publishedAt: null,
      },
    });
  }
}
