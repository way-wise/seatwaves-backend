import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from '../common/services/cache.service';
import { AuditService } from '../common/services/audit.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UploadService } from 'src/upload/upload.service';
import { CreateInterestDto } from './dto/interest.dto';
import * as bcrypt from 'bcrypt';
import { BusinessInfoStatus, Prisma, UserStatus } from '@prisma/client';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class UsersOptimizedService {
  private readonly logger = new Logger(UsersOptimizedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all users with optimized caching and role-based filtering
   */
  async findAll(
    query: any,
    requestingUserId?: string,
  ): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // Check requesting user's permissions
    await this.validateAdminAccess(requestingUserId);

    const cacheKey = `users:list:${page}:${limit}:${search || 'all'}:${status || 'all'}:${sortBy}:${sortOrder}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const where: Prisma.UserWhereInput = {
          deletedAt: null,
          status: { not: UserStatus.DELETED },
        };

        if (search) {
          where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ];
        }

        if (status) {
          where.status = status;
        }

        const [users, total] = await this.prisma.$transaction([
          this.prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatar: true,
              status: true,
              isEmailVerified: true,
              hostVerified: true,
              createdAt: true,
              roles: {
                select: {
                  role: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  bookings: true,
                  experience: true,
                  reviewsGiven: true,
                },
              },
            },
          }),
          this.prisma.user.count({ where }),
        ]);

        return {
          success: true,
          data: users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: skip + limit < total,
            hasPrev: page > 1,
          },
        };
      },
      300, // 5 minutes cache
    );
  }

  /**
   * Get user profile with caching and privacy controls
   */
  async findOne(id: string, requestingUserId?: string): Promise<any> {
    const cacheKey = `user:${id}:profile`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id, deletedAt: null },
          select: {
            id: true,
            name: true,
            email: requestingUserId === id, // Only show email to self
            username: true,
            bio: true,
            about: true,
            isEmailVerified: true,
            phone: requestingUserId === id, // Only show phone to self
            address: requestingUserId === id,
            dob: requestingUserId === id,
            gender: true,
            governmentID: false, // Never expose
            avatar: true,
            status: true,
            lattitude: true,
            longitude: true,
            hostVerified: true,
            createdAt: true,
            _count: {
              select: {
                bookings: true,
                reviewsGiven: true,
                experience: true,
              },
            },
            interests: {
              select: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
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
        });

        if (!user) throw new NotFoundException('User not found');
        return { success: true, data: user };
      },
      600, // 10 minutes cache
    );
  }

  /**
   * Update user profile with validation and audit logging
   */
  async updateProfile(
    id: string,
    data: UpdateUserDto,
    requestingUserId: string,
  ): Promise<any> {
    // Validate ownership or admin access
    if (id !== requestingUserId) {
      await this.validateAdminAccess(requestingUserId);
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id, deletedAt: null },
        select: { id: true, username: true, email: true },
      });

      if (!user) throw new NotFoundException('User not found');

      // Check username uniqueness if updating

      // Update user with validated data
      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          bio: true,
          about: true,
          phone: true,
          address: true,
          avatar: true,
          lattitude: true,
          longitude: true,
          dob: true,
          gender: true,
        },
      });

      // Invalidate cache
      await this.cacheService.invalidatePattern(`user:${id}:*`);

      // Audit log
      await this.auditService.log({
        userId: requestingUserId,
        action: 'UPDATE',
        resource: 'USER_PROFILE',
        resourceId: id,
        metadata: { updatedFields: Object.keys(data) },
      });

      this.logger.log(`User profile updated: ${id} by ${requestingUserId}`);

      return {
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      };
    });
  }

  /**
   * Admin-only user status update with proper validation
   */
  async updateUserStatus(
    id: string,
    data: AdminUpdateUserDto,
    adminId: string,
  ): Promise<any> {
    await this.validateAdminAccess(adminId);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id, deletedAt: null },
        select: { id: true, status: true, name: true },
      });

      if (!user) throw new NotFoundException('User not found');

      // Prevent status change if already in terminal state
      if (user.status === UserStatus.DELETED) {
        throw new BadRequestException('Cannot modify deleted user');
      }

      const updatedUser = await tx.user.update({
        where: { id },
        data: {
          status: data.status,
          blockedUntil:
            data.status === UserStatus.BLOCKED ? data.blockedUntil : null,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          blockedUntil: true,
        },
      });

      // Invalidate cache
      await this.cacheService.invalidatePattern(`user:${id}:*`);

      // Audit log
      await this.auditService.logAdminAction(
        adminId,
        'STATUS_UPDATE',
        'USER',
        id,
        {
          oldStatus: user.status,
          newStatus: data.status,
          blockedUntil: data.blockedUntil,
        },
      );

      this.logger.log(
        `User status updated: ${id} -> ${data.status} by admin ${adminId}`,
      );

      return {
        success: true,
        data: updatedUser,
        message: 'User status updated successfully',
      };
    });
  }

  /**
   * Secure user interests update with validation
   */
  async updateInterests(
    id: string,
    data: CreateInterestDto,
    requestingUserId: string,
  ): Promise<any> {
    if (id !== requestingUserId) {
      throw new ForbiddenException('Can only update own interests');
    }

    return this.prisma.$transaction(async (tx) => {
      // Validate category IDs
      const categories = await tx.category.findMany({
        where: { id: { in: data.categoryIds } },
        select: { id: true },
      });

      const foundIds = categories.map((c) => c.id);
      const missingIds = data.categoryIds.filter(
        (id) => !foundIds.includes(id),
      );

      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Invalid category IDs: ${missingIds.join(', ')}`,
        );
      }

      // Atomic replace operation
      await tx.userInterest.deleteMany({
        where: { userId: id },
      });

      if (data.categoryIds.length > 0) {
        await tx.userInterest.createMany({
          data: data.categoryIds.map((categoryId) => ({
            userId: id,
            categoryId,
          })),
        });
      }

      // Invalidate cache
      await this.cacheService.invalidatePattern(`user:${id}:*`);

      this.logger.log(
        `User interests updated: ${id} - Categories: ${data.categoryIds.length}`,
      );

      return {
        success: true,
        message: 'Interests updated successfully',
      };
    });
  }

  /**
   * Host verification with enhanced security
   */
  async submitHostVerification(
    userId: string,
    data: any,
    files: Express.Multer.File[],
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // Check if already submitted
      const existingInfo = await tx.businessInfo.findUnique({
        where: { userId },
        select: { id: true, status: true },
      });

      if (existingInfo && existingInfo.status === BusinessInfoStatus.VERIFIED) {
        throw new BadRequestException('Host already verified');
      }

      if (existingInfo && existingInfo.status === BusinessInfoStatus.PENDING) {
        throw new BadRequestException(
          'Verification already submitted and pending review',
        );
      }

      // Validate and upload documents
      if (!files || files.length === 0) {
        throw new BadRequestException('Business documents required');
      }

      const documents: string[] = [];
      for (const file of files) {
        // Validate file type and size
        if (!this.isValidDocumentType(file.mimetype)) {
          throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
        }

        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          throw new BadRequestException('File size too large');
        }

        const uploadResult = await this.uploadService.uploadFile(
          file,
          'documents',
        );
        documents.push(uploadResult.Key as string);
      }

      // Create or update business info
      const businessInfo = await tx.businessInfo.upsert({
        where: { userId },
        create: {
          ...data,
          userId,
          documents,
          status: BusinessInfoStatus.PENDING,
        },
        update: {
          ...data,
          documents,
          status: BusinessInfoStatus.PENDING,
        },
      });

      // Audit log
      await this.auditService.log({
        userId,
        action: 'SUBMIT',
        resource: 'HOST_VERIFICATION',
        resourceId: businessInfo.id,
        metadata: { documentsCount: documents.length },
      });

      this.logger.log(`Host verification submitted: ${userId}`);

      return {
        success: true,
        status: 'SUBMITTED',
        message: 'Verification submitted successfully',
      };
    });
  }

  /**
   * Admin approval of host verification
   */
  async approveHostVerification(
    verificationId: string,
    status: BusinessInfoStatus,
    adminId: string,
    message?: string,
  ): Promise<any> {
    await this.validateAdminAccess(adminId);

    return this.prisma.$transaction(async (tx) => {
      const businessInfo = await tx.businessInfo.findUnique({
        where: { id: verificationId },
        include: { user: { select: { id: true, name: true } } },
      });

      if (!businessInfo) {
        throw new NotFoundException('Verification not found');
      }

      if (businessInfo.status === BusinessInfoStatus.VERIFIED) {
        throw new BadRequestException('Already verified');
      }

      // Update business info and user status atomically
      await Promise.all([
        tx.businessInfo.update({
          where: { id: verificationId },
          data: {
            status,
            isVerified: status === BusinessInfoStatus.VERIFIED,
            verifiedAt:
              status === BusinessInfoStatus.VERIFIED ? new Date() : null,
            verifiedById: adminId,
            message,
          },
        }),
        tx.user.update({
          where: { id: businessInfo.userId },
          data: {
            hostVerified: status === BusinessInfoStatus.VERIFIED,
          },
        }),
      ]);

      // Invalidate cache
      await this.cacheService.invalidatePattern(
        `user:${businessInfo.userId}:*`,
      );
      await this.cacheService.invalidatePattern('business:*');

      // Audit log
      await this.auditService.logAdminAction(
        adminId,
        'VERIFICATION_DECISION',
        'HOST_VERIFICATION',
        verificationId,
        {
          decision: status,
          hostId: businessInfo.userId,
          hostName: businessInfo.user.name,
        },
      );

      this.logger.log(
        `Host verification ${status.toLowerCase()}: ${businessInfo.userId} by admin ${adminId}`,
      );

      return {
        success: true,
        message: `Verification ${status.toLowerCase()} successfully`,
      };
    });
  }

  /**
   * Secure user deletion with cascade handling
   */
  async deleteUser(
    id: string,
    body: any,
    requestingUserId: string,
  ): Promise<any> {
    // Only allow self-deletion or admin deletion
    if (id !== requestingUserId) {
      await this.validateAdminAccess(requestingUserId);
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id, deletedAt: null },
        select: {
          id: true,
          password: true,
          status: true,
          _count: {
            select: {
              bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } } },
              experience: { where: { status: 'PUBLISHED' } },
            },
          },
        },
      });

      if (!user) throw new NotFoundException('User not found');

      // Validate password for self-deletion
      if (id === requestingUserId && body.password) {
        const isValid = await bcrypt.compare(body.password, user.password);
        if (!isValid) throw new BadRequestException('Invalid password');
      }

      // Check for active bookings or experiences
      if (user._count.bookings > 0) {
        throw new BadRequestException(
          'Cannot delete user with active bookings',
        );
      }

      if (user._count.experience > 0) {
        throw new BadRequestException(
          'Cannot delete user with published experiences',
        );
      }

      // Soft delete user
      await tx.user.update({
        where: { id },
        data: {
          status: UserStatus.DELETED,
          deletedAt: new Date(),
          email: `deleted_${Date.now()}_${user.id}@deleted.local`, // Anonymize email
        },
      });

      // Invalidate all user caches
      await this.cacheService.invalidatePattern(`user:${id}:*`);

      // Audit log
      await this.auditService.log({
        userId: requestingUserId,
        action: 'DELETE',
        resource: 'USER',
        resourceId: id,
        metadata: { selfDeletion: id === requestingUserId },
      });

      this.logger.log(`User deleted: ${id} by ${requestingUserId}`);

      return { success: true, message: 'User deleted successfully' };
    });
  }

  /**
   * Get user roles with caching
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const cacheKey = `user:${userId}:roles`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const userRoles = await this.prisma.userRoles.findMany({
          where: { userId },
          include: { role: { select: { name: true } } },
        });

        return userRoles.map((ur) => ur.role.name);
      },
      3600, // 1 hour cache
    );
  }

  /**
   * Check if user has specific role
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(roleName);
  }

  /**
   * Validate admin access
   */
  private async validateAdminAccess(userId?: string): Promise<void> {
    if (!userId) {
      throw new ForbiddenException('Authentication required');
    }

    const isAdmin = await this.hasRole(userId, 'ADMIN');
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Validate document file types
   */
  private isValidDocumentType(mimetype: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedTypes.includes(mimetype);
  }

  /**
   * Get user activity summary for dashboard
   */
  async getUserActivitySummary(userId: string): Promise<any> {
    const cacheKey = `user:${userId}:activity:summary`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const [bookingsCount, experiencesCount, reviewsCount, recentActivity] =
          await this.prisma.$transaction([
            this.prisma.booking.count({
              where: { userId, deletedAt: null },
            }),
            this.prisma.experience.count({
              where: { userId, deletedAt: null },
            }),
            this.prisma.review.count({
              where: { reviewerId: userId },
            }),
            this.prisma.activityLog.findMany({
              where: { userId },
              take: 10,
              orderBy: { createdAt: 'desc' },
              select: {
                action: true,
                createdAt: true,
                metadata: true,
              },
            }),
          ]);

        return {
          bookingsCount,
          experiencesCount,
          reviewsCount,
          recentActivity,
        };
      },
      1800, // 30 minutes cache
    );
  }
}
