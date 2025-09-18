import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: data.userId || 'system',
          action: `${data.action}:${data.resource}`,
          type: data.resource,
          metadata: JSON.stringify({
            resourceId: data.resourceId,
            userAgent: data.userAgent,
            timestamp: new Date().toISOString(),
            ...data.metadata,
          }),
          ipAddress: data.ipAddress || 'unknown',
        },
      });
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
    }
  }

  async logBookingAction(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'CANCEL' | 'CONFIRM',
    bookingId: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'BOOKING',
      resourceId: bookingId,
      metadata,
    });
  }

  async logPaymentAction(
    userId: string,
    action: 'INITIATE' | 'SUCCESS' | 'FAILED' | 'REFUND',
    transactionId: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'PAYMENT',
      resourceId: transactionId,
      metadata,
    });
  }

  async logAdminAction(
    adminId: string,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: any,
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action: `ADMIN_${action}`,
      resource,
      resourceId,
      metadata,
    });
  }
}
