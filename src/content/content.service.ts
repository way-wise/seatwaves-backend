import { Injectable } from '@nestjs/common';
import {
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import {
  createHeroSection,
  CreateHeroSectionDto,
  updateHeroSection,
  UpdateHeroSectionDto,
} from './dto/home.dto';
import {
  CreateAboutDto,
  createAboutSchema,
  UpdateAboutDto,
  updateAboutSchema,
} from './dto/about.dto';
import {
  CreateTestimonialDto,
  createTestimonialSchema,
  UpdateTestimonialDto,
  updateTestimonialSchema,
} from './dto/testimonial.dto';
import {
  CreateSimplePageDto,
  UpdateSimplePageDto,
  createSimplePageSchema,
  updateSimplePageSchema,
  CreateBannerDto,
  UpdateBannerDto,
  createBannerSchema,
  updateBannerSchema,
  CreateCardDto,
  UpdateCardDto,
  createCardSchema,
  updateCardSchema,
} from './dto/content.dto';
import {
  CreateSiteSettingDto,
  createSiteSettingSchema,
  updateSiteSettingSchema,
  UpdateSiteSettingDto,
} from './dto/sitesetting.dto';
import {
  CreateContactInfoDto,
  UpdateContactInfoDto,
  createContactInfoSchema,
  updateContactInfoSchema,
} from './dto/contact.dto';
import { z } from 'zod';
// simple local slug generator to avoid extra deps
const makeSlug = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 255);

// Safely parse JSON from multipart text fields
function safeJsonParse<T = any>(raw: string): T {
  try {
    return JSON.parse(raw);
  } catch {
    throw new NotAcceptableException('Invalid JSON payload');
  }
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  //site settings
  async getSiteSetting() {
    const data = await this.prisma.settings.findFirst();
    return { status: true, data };
  }

  //create site setting
  async createSiteSetting(
    data: CreateSiteSettingDto,
    files?: {
      siteLogo?: Express.Multer.File[];
      siteFavicon?: Express.Multer.File[];
    },
  ) {
    const parsed = createSiteSettingSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);
    // ensure only one settings row exists; if present, update it
    const existing = await this.prisma.settings.findFirst();

    let siteLogoKey: string | undefined = parsed.data.siteLogo;
    let siteFaviconKey: string | undefined = parsed.data.siteFavicon;

    const logoFile = files?.siteLogo?.[0];
    const faviconFile = files?.siteFavicon?.[0];

    if (logoFile) {
      const upload = await this.uploadService.uploadFile(logoFile, 'settings');
      siteLogoKey = upload.Key;
    }
    if (faviconFile) {
      const upload = await this.uploadService.uploadFile(
        faviconFile,
        'settings',
      );
      siteFaviconKey = upload.Key;
    }

    if (existing) {
      const updated = await this.prisma.settings.update({
        where: { id: existing.id },
        data: {
          ...parsed.data,
          siteLogo: siteLogoKey,
          siteFavicon: siteFaviconKey,
        },
      });
      return {
        status: true,
        data: updated,
        message: 'Site setting updated successfully.',
      };
    }

    const created = await this.prisma.settings.create({
      data: {
        ...parsed.data,
        siteLogo: siteLogoKey,
        siteFavicon: siteFaviconKey,
      },
    });
    return {
      status: true,
      data: created,
      message: 'Site setting created successfully.',
    };
  }

  //update site setting
  async updateSiteSetting(
    id: string,
    data: UpdateSiteSettingDto,
    files?: {
      siteLogo?: Express.Multer.File[];
      siteFavicon?: Express.Multer.File[];
    },
  ) {
    const parsed = updateSiteSettingSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);
    const existing = await this.prisma.settings.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Site setting not found');

    let siteLogoKey: string | undefined =
      parsed.data.siteLogo ?? existing.siteLogo ?? undefined;
    let siteFaviconKey: string | undefined =
      parsed.data.siteFavicon ?? existing.siteFavicon ?? undefined;

    const logoFile = files?.siteLogo?.[0];
    const faviconFile = files?.siteFavicon?.[0];

    if (logoFile) {
      if (siteLogoKey) await this.uploadService.deleteFile(siteLogoKey);
      const upload = await this.uploadService.uploadFile(logoFile, 'settings');
      siteLogoKey = upload.Key;
    }
    if (faviconFile) {
      if (siteFaviconKey) await this.uploadService.deleteFile(siteFaviconKey);
      const upload = await this.uploadService.uploadFile(
        faviconFile,
        'settings',
      );
      siteFaviconKey = upload.Key;
    }

    const updated = await this.prisma.settings.update({
      where: { id },
      data: {
        ...parsed.data,
        siteLogo: siteLogoKey,
        siteFavicon: siteFaviconKey,
      },
    });
    return {
      status: true,
      data: updated,
      message: 'Site setting updated successfully.',
    };
  }

  // ===== Contact Information =====
  async getContactInfo() {
    const data = await this.prisma.contactinformation.findFirst();
    return { status: true, data };
  }

  async createContactInfo(data: CreateContactInfoDto) {
    const parsed = createContactInfoSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);
    const existing = await this.prisma.contactinformation.findFirst();
    if (existing) {
      const updated = await this.prisma.contactinformation.update({
        where: { id: existing.id },
        data: parsed.data,
      });
      return {
        status: true,
        data: updated,
        message: 'Contact information updated successfully.',
      };
    }
    const created = await this.prisma.contactinformation.create({
      data: parsed.data,
    });
    return {
      status: true,
      data: created,
      message: 'Contact information created successfully.',
    };
  }

  async updateContactInfo(id: string, data: UpdateContactInfoDto) {
    const parsed = updateContactInfoSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);
    const existing = await this.prisma.contactinformation.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Contact information not found');
    const updated = await this.prisma.contactinformation.update({
      where: { id },
      data: parsed.data,
    });
    return {
      status: true,
      data: updated,
      message: 'Contact information updated successfully.',
    };
  }

  // ====== HomePage ======
  async createHeroSection(
    data: CreateHeroSectionDto,
    file?: Express.Multer.File,
  ) {
    const parsed = createHeroSection.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);

    // If any HomePage exists, update it instead of creating a new one
    let imageKey: string | undefined;
    if (file) {
      const upload = await this.uploadService.uploadFile(file, 'hero');
      imageKey = upload.Key;
    }

    //check already exists
    const existing = await this.prisma.heroSection.findFirst();
    if (existing) {
      this.logger.log(
        `Hero section exists (${existing.id}), updating instead of creating`,
      );
      return this.updateHeroSection(
        existing.id,
        parsed.data as UpdateHeroSectionDto,
        file,
      );
    }

    const created = await this.prisma.heroSection.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        image: imageKey,
      },
    });
    this.logger.log(`Created Hero section ${created.id}`);
    return {
      status: true,
      data: created,
      message: 'Hero section created successfully.',
    };
  }

  async updateHeroSection(
    id: string,
    data: UpdateHeroSectionDto,
    file?: Express.Multer.File,
  ) {
    const parsed = updateHeroSection.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);

    const heroSection = await this.prisma.heroSection.findUnique({
      where: { id },
    });
    if (!heroSection) throw new NotFoundException('Hero section not found');
    // Preserve existing image if no new file is provided
    const currentImage: string | undefined = heroSection.image ?? undefined;
    let imageKey: string | undefined = currentImage;

    if (file) {
      if (imageKey) {
        await this.uploadService.deleteFile(imageKey);
      }
      // Keep folder naming consistent with createHeroSection
      const upload = await this.uploadService.uploadFile(file, 'hero');
      imageKey = upload.Key;
    }

    const updated = await this.prisma.heroSection.update({
      where: { id },
      data: {
        ...parsed.data,
        image: imageKey,
      },
    });

    return {
      status: true,
      data: updated,
      message: 'Hero section updated successfully.',
    };
  }

  // ====== BecomeHost ======

  // ====== Testimonial ======
  async createTestimonial(
    data: CreateTestimonialDto,
    file?: Express.Multer.File,
  ) {
    const parsed = createTestimonialSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);

    let imageKey: string | undefined;
    if (file) {
      const upload = await this.uploadService.uploadFile(file, 'testimonials');
      imageKey = upload.Key;
    }

    const created = await this.prisma.testimonial.create({
      data: {
        name: parsed.data.name,
        badgeTitle: parsed.data.badgeTitle,
        designation: parsed.data.designation,
        title: parsed.data.title,
        description: parsed.data.description,
        position: parsed.data.position,
        isActive: parsed.data.isActive ?? true,
        image: imageKey,
      },
    });
    this.logger.log(`Created testimonial ${created.id}`);
    return {
      status: true,
      data: created,
      message: 'Testimonial created successfully.',
    };
  }

  async updateTestimonial(
    id: string,
    data: UpdateTestimonialDto,
    file?: Express.Multer.File,
  ) {
    const parsed = updateTestimonialSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);

    const existing = await this.prisma.testimonial.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Testimonial not found');

    let imageKey = existing.image || undefined;
    if (file) {
      if (imageKey) await this.uploadService.deleteFile(imageKey);
      const upload = await this.uploadService.uploadFile(file, 'testimonials');
      imageKey = upload.Key;
    }

    const updated = await this.prisma.testimonial.update({
      where: { id },
      data: {
        name: parsed.data.name,
        badgeTitle: parsed.data.badgeTitle,
        designation: parsed.data.designation,
        title: parsed.data.title,
        description: parsed.data.description,
        position: parsed.data.position,
        isActive: parsed.data.isActive,
        image: imageKey,
      },
    });
    this.logger.log(`Updated testimonial ${id}`);
    return {
      status: true,
      data: updated,
      message: 'Testimonial updated successfully.',
    };
  }

  // ===== Admin reads =====
  async getHeroSectionAdmin() {
    const data = await this.prisma.heroSection.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    if (!data) throw new NotFoundException('Active home page not found');
    return { status: true, data };
  }

  // ===== Public reads =====
  async getHeroSection() {
    const [data, setting] = await this.prisma.$transaction([
      this.prisma.heroSection.findFirst({
        select: {
          id: true,
          title: true,
          description: true,
          image: true,
        },
      }),
      this.prisma.settings.findFirst(),
    ]);

    return { status: true, data, setting };
  }

  async listTestimonials(query?: { page?: string; limit?: string }) {
    const page = parseInt(query?.page || '1');
    const limit = parseInt(query?.limit || '10');
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.testimonial.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.testimonial.count(),
    ]);
    return {
      status: true,
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  //public testimonial
  async getTestimonials() {
    const data = await this.prisma.testimonial.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        badgeTitle: true,
        designation: true,
        title: true,
        description: true,
        isActive: true,
        image: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { status: true, data };
  }

  // ===== Banner (no SEO) =====
  async createBanner(data: CreateBannerDto, file?: Express.Multer.File) {
    const parsed = createBannerSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);
    let imageKey = parsed.data.image;
    if (file) {
      const upload = await this.uploadService.uploadFile(file, 'banner');
      imageKey = upload.Key;
    }
    const created = await this.prisma.banner.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        image: imageKey,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return {
      status: true,
      data: created,
      message: 'banner created successfully.',
    };
  }

  async updateBanner(
    id: string,
    data: UpdateBannerDto,
    file?: Express.Multer.File,
  ) {
    const parsed = updateBannerSchema.safeParse(data);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);
    const existing = await this.prisma.banner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('banner not found');
    let imageKey = existing.image || parsed.data.image;
    if (file) {
      if (imageKey) await this.uploadService.deleteFile(imageKey);
      const upload = await this.uploadService.uploadFile(file, 'banner');
      imageKey = upload.Key;
    }
    const updated = await this.prisma.banner.update({
      where: { id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        image: imageKey,
        isActive: parsed.data.isActive,
      },
    });
    return {
      status: true,
      data: updated,
      message: 'banner updated successfully.',
    };
  }

  async getBannersAdmin() {
    const data = await this.prisma.banner.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return { status: true, data };
  }

  async getBanners() {
    const data = await this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { status: true, data };
  }

  // ===== Card (no SEO) =====

  async deleteCard(id: string) {
    const deleted = await this.prisma.card.delete({ where: { id } });
    return {
      status: true,
      data: deleted,
      message: 'card deleted successfully.',
    };
  }

  // ===== Dynamic Page (with SEO) =====
  private dynamicPageCreateSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    content: z.string().optional(),
    image: z.string().optional(),
    seo: z
      .object({
        metaTitle: z.string().min(1),
        metaDescription: z.string().optional(),
        metaKeywords: z.string().optional(),
        robotsIndex: z.boolean().optional(),
        robotsFollow: z.boolean().optional(),
        ogTitle: z.string().optional(),
        ogDescription: z.string().optional(),
        ogImage: z.string().optional(),
        ogType: z.string().optional(),
        ogSiteName: z.string().optional(),
        structuredData: z.any().optional(),
        changefreq: z
          .enum([
            'ALWAYS',
            'HOURLY',
            'DAILY',
            'WEEKLY',
            'MONTHLY',
            'YEARLY',
            'NEVER',
          ])
          .optional(),
        priority: z.number().optional(),
      })
      .strict(),
  });

  private dynamicPageUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    content: z.string().optional(),
    image: z.string().optional(),
    seo: this.dynamicPageCreateSchema.shape.seo.partial().optional(),
  });

  async createDynamicPage(
    raw: any,
    files?: { image?: Express.Multer.File[]; ogImage?: Express.Multer.File[] },
  ) {
    const normalized: any =
      raw && typeof raw.seo === 'string'
        ? { ...raw, seo: safeJsonParse(raw.seo) }
        : raw;

    const parsed = this.dynamicPageCreateSchema.safeParse(normalized);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);

    // normalize slug
    const slug = makeSlug(parsed.data.slug);

    // prevent duplicate
    const exists = await this.prisma.dynamicPage.findUnique({
      where: { slug },
    });
    if (exists) throw new NotAcceptableException('Slug already exists');

    // handle uploads
    let pageImageKey: string | undefined = parsed.data.image;
    const imageFile = files?.image?.[0];
    if (imageFile) {
      const upload = await this.uploadService.uploadFile(imageFile, 'pages');
      pageImageKey = upload.Key;
    }

    let ogKey: string | undefined = parsed.data.seo.ogImage;
    const ogFile = files?.ogImage?.[0];
    if (ogFile) {
      const upload = await this.uploadService.uploadFile(ogFile, 'seo');
      ogKey = upload.Key;
    }

    const seo = await this.prisma.seoMetadata.create({
      data: {
        ...parsed.data.seo,
        ogImage: ogKey,
      },
    });

    const created = await this.prisma.dynamicPage.create({
      data: {
        title: parsed.data.title,
        slug,
        description: parsed.data.description,
        content: parsed.data.content,
        image: pageImageKey,
        seoId: seo.id,
      },
      include: { seo: true },
    });

    return {
      status: true,
      data: created,
      message: 'Dynamic page created successfully.',
    };
  }

  async updateDynamicPageBySlug(
    slugParam: string,
    raw: any,
    files?: { image?: Express.Multer.File[]; ogImage?: Express.Multer.File[] },
  ) {
    const normalized: any =
      raw && typeof raw.seo === 'string'
        ? { ...raw, seo: safeJsonParse(raw.seo) }
        : raw;
    const parsed = this.dynamicPageUpdateSchema.safeParse(normalized);
    if (!parsed.success) throw new NotAcceptableException(parsed.error.errors);

    const slug = makeSlug(slugParam);
    const existing = await this.prisma.dynamicPage.findUnique({
      where: { slug },
      include: { seo: true },
    });
    if (!existing) throw new NotFoundException('Dynamic page not found');

    // handle page image
    let pageImageKey: string | undefined = existing.image ?? undefined;
    const imageFile = files?.image?.[0];
    if (imageFile) {
      if (pageImageKey) await this.uploadService.deleteFile(pageImageKey);
      const upload = await this.uploadService.uploadFile(imageFile, 'pages');
      pageImageKey = upload.Key;
    }

    // handle SEO og image
    let ogKey: string | undefined =
      parsed.data.seo?.ogImage ?? existing.seo?.ogImage ?? undefined;
    const ogFile = files?.ogImage?.[0];
    if (ogFile) {
      if (existing.seo?.ogImage)
        await this.uploadService.deleteFile(existing.seo.ogImage);
      const upload = await this.uploadService.uploadFile(ogFile, 'seo');
      ogKey = upload.Key;
    }

    if (parsed.data.seo || ogFile) {
      await this.prisma.seoMetadata.update({
        where: { id: existing.seoId },
        data: { ...(parsed.data.seo || {}), ogImage: ogKey },
      });
    }

    const updated = await this.prisma.dynamicPage.update({
      where: { slug },
      data: {
        ...(parsed.data.title !== undefined
          ? { title: parsed.data.title }
          : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.content !== undefined
          ? { content: parsed.data.content }
          : {}),
        image: pageImageKey,
      },
      include: { seo: true },
    });

    return {
      status: true,
      data: updated,
      message: 'Dynamic page updated successfully.',
    };
  }
}
