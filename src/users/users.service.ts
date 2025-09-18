import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  AdminUpdateUserDto,
  adminUpdateUserSchema,
} from './dto/admin-update-user.dto';
import { UploadService } from 'src/upload/upload.service';
import { businessInfoSchema } from './dto/businessInfo.dto';
import { CreateInterestDto } from './dto/interest.dto';
import * as bcrypt from 'bcrypt';
import {
  NotificationsSettingsDto,
  notificationsSettingsSchema,
} from './dto/notification.dto';
import { businessInfoUpdateSchema } from './dto/businessinfoUpdate.dto';
import { deleteUserSchema } from './dto/delete.user.dto';
import { BusinessInfoStatus, Prisma } from '@prisma/client';
import { userQuerySchema } from './dto/userQuery.dto';
import { businessInfoQuerySchema } from './dto/bussinessinfo.query.dto';
import { EmailService } from 'src/email/email.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  private logger = new Logger(UsersService.name);

  async findAll(query: any) {
    const parseQuery = userQuerySchema.safeParse(query);

    if (!parseQuery.success) {
      throw new BadRequestException(parseQuery.error.errors);
    }

    const {
      search,
      page = '1',
      limit = '10',
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      from,
      to,
      inactive,
    } = parseQuery.data as any;

    const limits = parseInt(limit);
    const pages = parseInt(page);
    const skip = (pages - 1) * limits;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    //search value name=value and email=value
    if (search) {
      const searchValue = search.split('=');
      where.OR = [
        { [searchValue[0]]: { contains: searchValue[1], mode: 'insensitive' } },
      ];
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

    // createdAt date range filter
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate.getTime())) {
          createdAt.gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate.getTime())) {
          createdAt.lte = toDate;
        }
      }
      if (Object.keys(createdAt).length) {
        (where as any).createdAt = createdAt;
      }
    }

    // Inactivity filter based on lastLoginAt: e.g., '30d', '90d', '6m', '1y'
    if (inactive && typeof inactive === 'string') {
      const now = new Date();
      const m = inactive.match(/^(\d+)([dmy])$/i);
      let cutoff: Date | null = null;
      if (m) {
        const count = parseInt(m[1], 10);
        const unit = m[2].toLowerCase();
        const d = new Date(now);
        if (unit === 'd') d.setDate(d.getDate() - count);
        else if (unit === 'm') d.setMonth(d.getMonth() - count);
        else if (unit === 'y') d.setFullYear(d.getFullYear() - count);
        cutoff = d;
      }
      if (cutoff) {
        // Users who have never logged in OR last login before cutoff
        const andList: Prisma.UserWhereInput[] = (where.AND as any) || [];
        andList.push({
          OR: [{ lastLoginAt: null }, { lastLoginAt: { lte: cutoff } }],
        });
        where.AND = andList;
      }
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limits,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          status: true,
          lastLoginAt: true,
          userLoyalty: {
            select: {
              id: true,
              totalEarned: true,
              totalRedeemed: true,
            },
          },
          roles: {
            select: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      status: true,
      data: users,
      pagination: {
        total,
        page: pages,
        limit: limits,
        totalPages: Math.ceil(total / limits),
        next: pages < Math.ceil(total / limits),
        prev: pages > 1,
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        about: true,
        isEmailVerified: true,
        isTwoFactorEnabled: true,
        phone: true,
        address: true,
        city: true,
        zipCode: true,
        state: true,
        country: true,
        dob: true,
        gender: true,
        governmentID: true,
        createdAt: true,
        _count: {
          select: { bookings: true, reviewsGiven: true },
        },
        avatar: true,
        status: true,
        lattitude: true,
        longitude: true,
        loginHistory: {
          take: 5,
          orderBy: {
            createdAt: 'desc',
          },
        },

        interests: {
          select: {
            category: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found.');
    return { status: true, data: user };
  }

  async toggleTwoFactor(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    await this.prisma.user.update({
      where: { id },
      data: { isTwoFactorEnabled: !user.isTwoFactorEnabled },
    });
    return {
      status: true,
      message: 'Two-factor authentication successfully toggled.',
    };
  }

  async interests(id: string, data: CreateInterestDto) {
    const categoryIds = data.categoryIds;

    // Validate category IDs
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
    });

    const foundIds = categories.map((c) => c.id);
    const missingIds = categoryIds.filter((id) => !foundIds.includes(id));

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Category ID(s) not found: ${missingIds.join(', ')}`,
      );
    }

    // Perform delete and create in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.userInterest.deleteMany({
        where: { userId: id },
      });

      await tx.userInterest.createMany({
        data: categoryIds.map((categoryId) => ({
          userId: id,
          categoryId,
        })),
      });
    });

    return {
      status: true,
      message: 'Interest created successfully.',
    };
  }

  async updateProfile(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        bio: true,
        about: true,
        phone: true,
        address: true,
        avatar: true,
        lattitude: true,
        longitude: true,
        dob: true,
        governmentID: true,
        gender: true,
      },
    });
    return {
      status: true,
      data: updatedUser,
      message: 'Profile updated successfully.',
    };
  }

  async toggleStatus(id: string, data: AdminUpdateUserDto) {
    const parseData = adminUpdateUserSchema.safeParse(data);
    if (!parseData.success) {
      throw new BadRequestException(parseData.error.message);
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        status: true,
      },
    });
    return {
      status: true,
      data: updatedUser,
      message: 'User status successfully updated.',
    };
  }

  async updateAvatar(id: string, file: Express.Multer.File, userId: string) {
    if (!file) throw new NotFoundException('File not found.');
    const exist = await this.prisma.user.findUnique({ where: { id } });

    if (!exist) throw new NotFoundException('User not found.');
    if (exist.id !== userId)
      throw new ForbiddenException(
        'You are not authorized to update this user.',
      );

    if (exist.avatar) {
      await this.uploadService.deleteFile(exist.avatar);
    }

    const uploadResult = await this.uploadService.uploadFile(file, 'users');
    await this.prisma.user.update({
      where: { id },
      data: { avatar: uploadResult.Key },
    });

    return {
      status: true,
      message: 'Avatar updated successfully.',
    };
  }

  async deleteUser(id: string, body: any) {
    const parseData = deleteUserSchema.safeParse(body);

    if (!parseData.success) {
      throw new BadRequestException(parseData.error);
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    //validate password
    const isValid = await bcrypt.compare(
      parseData.data.password,
      user.password,
    );
    if (!isValid) throw new BadRequestException('Invalid password.');

    //User Soft Delete
    await this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });

    this.logger.log(`User ${id} deleted successfully.`);
    return { status: true, message: 'User deleted successfully.' };
  }

  async deleteAll() {
    await this.prisma.user.deleteMany({ where: {} });
    return { status: true, message: 'All users deleted successfully.' };
  }

  //HOST Verification
  async verifyHost(userId: string, data, files: Express.Multer.File[]) {
    const parseData = businessInfoSchema.safeParse(data);

    if (!parseData.success) {
      throw new BadRequestException(parseData.error);
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not Exist');
    }

    const existingInfo = await this.prisma.businessInfo.findUnique({
      where: { sellerId: userId },
    });

    if (existingInfo) {
      throw new BadRequestException(
        'You have already applied for host verification.',
      );
    }

    let documents = [] as string[];

    if (files.length > 0) {
      for (const file of files) {
        const uploadResult = await this.uploadService.uploadFile(
          file,
          'documents',
        );
        documents.push(uploadResult.Key as string);
      }
    }

    await this.prisma.businessInfo.create({
      data: {
        ...parseData.data,
        documents,
        seller: { connect: { id: userId } },
      },
    });

    this.logger.log(`User ${userId} applied for host verification`);
    //notification send to user
    this.notificationService.sendNotification(userId, {
      title: 'Host Verification',
      message:
        'Your host verification request has been submitted successfully.',
      type: 'NOTIFY',
    });

    //send email notification to user
    this.emailService.sendEmail(
      user.email,
      'Host Verification',
      'Your host verification request has been submitted successfully.',
    );

    return {
      status: 'SUBMITTED',
      message: 'Verification applied successfully',
    };
  }

  //update business info
  async updateBusinessInfo(
    id: string,
    data: any,
    files: Express.Multer.File[],
  ) {
    const parseData = businessInfoUpdateSchema.safeParse(data);

    if (!parseData.success) {
      throw new BadRequestException(parseData.error);
    }

    const existingInfo = await this.prisma.businessInfo.findUnique({
      where: { sellerId: id },
    });

    if (!existingInfo) {
      throw new NotFoundException('Business information not found.');
    }

    const existingDocuments = existingInfo.documents;

    if (existingDocuments.length > 0) {
      for (const doc of existingDocuments) {
        await this.uploadService.deleteFile(doc);
      }
    }

    let documents = [] as string[];

    if (files.length > 0) {
      for (const file of files) {
        const uploadResult = await this.uploadService.uploadFile(
          file,
          'documents',
        );
        documents.push(uploadResult.Key as string);
      }
    }

    await this.prisma.businessInfo.update({
      where: { sellerId: id },
      data: {
        ...parseData.data,
        status: 'PENDING',
        documents: documents.length > 0 ? documents : undefined,
      },
    });

    this.notificationService.sendNotification(id, {
      title: 'Host Verification',
      message:
        'Your host verification request has been re-submitted successfully.',
      type: 'NOTIFY',
    });

    return { status: true, message: 'Business info updated successfully' };
  }

  async getBusinessInfo(id: string) {
    const businessInfo = await this.prisma.businessInfo.findUnique({
      where: { sellerId: id },
    });

    if (!businessInfo) {
      throw new NotFoundException('Business information not found.');
    }

    return { status: true, data: businessInfo };
  }

  async getVerification(id: string) {
    const verification = await this.prisma.businessInfo.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found.');
    }

    return { status: true, data: verification };
  }

  async getAllSubmittedVerification(query: any) {
    const parseQuery = businessInfoQuerySchema.safeParse(query);

    if (!parseQuery.success) {
      throw new BadRequestException(parseQuery.error.errors);
    }

    const {
      search,
      page = '1',
      limit = '10',
      status = 'PENDING',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = parseQuery.data;
    const limits = parseInt(limit);
    const pages = parseInt(page);
    const skip = (pages - 1) * limits;

    let where: Prisma.BusinessInfoWhereInput = {
      status: status as BusinessInfoStatus,
    };

    if (search) {
      where.OR = [
        { seller: { name: { contains: search, mode: 'insensitive' } } },
        { seller: { email: { contains: search, mode: 'insensitive' } } },
        { seller: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // i found status PENDIGNG.VERIFIED mutiple status

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
    const [data, count] = await this.prisma.$transaction([
      this.prisma.businessInfo.findMany({
        where,
        skip,
        take: limits,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatar: true,
            },
          },
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.businessInfo.count({ where }),
    ]);
    return {
      status: true,
      data,
      meta: {
        total: count,
        page: pages,
        limit: limits,
        totalPages: Math.ceil(count / limits),
      },
    };
  }

  async updateBusinessInfoStatus(
    id: string,
    status: BusinessInfoStatus,
    message?: string,
  ) {
    if (!Object.values(BusinessInfoStatus).includes(status)) {
      throw new BadRequestException('Invalid status.');
    }
    const businessInfo = await this.prisma.businessInfo.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!businessInfo) throw new NotFoundException('Business info not found.');

    // if (businessInfo.status === 'VERIFIED') {
    //   await this.prisma.user.update({
    //     where: { id: businessInfo.userId },
    //     data: { hostVerified: true },
    //   });

    //   throw new BadRequestException('.');
    // }

    await this.prisma.$transaction([
      this.prisma.businessInfo.update({
        where: { id },
        data: { status, isVerified: status === 'VERIFIED', message },
      }),
      this.prisma.user.update({
        where: { id: businessInfo.sellerId },
        data: { isSellerVerified: status === 'VERIFIED' },
      }),
    ]);

    if (status === 'VERIFIED') {
      // assign HOST role (idempotent)
      const hostRole = await this.prisma.role.findUnique({
        where: { name: 'HOST' },
      });
      if (!hostRole) throw new NotFoundException('HOST role not found.');

      await this.prisma.userRoles.upsert({
        where: {
          userId_roleId: {
            userId: businessInfo.sellerId,
            roleId: hostRole.id,
          },
        },
        create: {
          userId: businessInfo.sellerId,
          roleId: hostRole.id,
        },
        update: {},
      });

      //notification send to user
      this.notificationService.sendNotification(businessInfo.sellerId, {
        title: 'Host Verification',
        message: `${businessInfo.seller.name} has been approved as a host.`,
        type: 'NOTIFY',
      });

      //send email notification to user
      this.emailService.sendEmail(
        businessInfo.seller.email,
        'Host Verification',
        `${businessInfo.seller.name} has been approved as a host.`,
        `<p>${businessInfo.seller.name} has been approved as a host.</p> </br> <p>${message}</p>`,
      );
    } else {
      //notification send to user
      this.notificationService.sendNotification(businessInfo.sellerId, {
        title: 'Host Verification',
        message: `${businessInfo.seller.name} has been rejected as a host.`,
        type: 'NOTIFY',
      });
      //send email notification to user
      this.emailService.sendEmail(
        businessInfo.seller.email,
        'Host Verification',
        `${businessInfo.seller.name} has been rejected as a host.`,
        `<p>${businessInfo.seller.name} has been rejected as a host.</p> </br> <p>${message}</p>`,
      );
    }

    return {
      status: true,
      message: 'Business info status updated successfully.',
    };
  }

  async updateNotificationSettings(
    userId: string,
    body: NotificationsSettingsDto,
  ) {
    const parseData = notificationsSettingsSchema.safeParse(body);

    if (!parseData.success) {
      throw new BadRequestException(parseData.error.errors);
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationSettings: {
          upsert: {
            create: parseData.data,
            update: parseData.data,
          },
        },
      },
      select: {
        notificationSettings: true,
      },
    });

    return {
      status: true,
      data: updatedUser.notificationSettings,
      message: 'Notification settings updated successfully.',
    };
  }

  async getNotificationSettings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        notificationSettings: true,
      },
    });

    if (!user) throw new NotFoundException('User not found.');

    return {
      status: true,
      data: user.notificationSettings,
    };
  }
}
