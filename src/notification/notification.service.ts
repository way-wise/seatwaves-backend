import { NotificationType } from '@prisma/client';
import {
  Injectable,
  Logger,
  NotAcceptableException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationQuerySchema } from './dto/notification.query.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from 'src/queues/queue.constants';
import { notificationsSettingsSchema } from 'src/users/dto/notification.dto';
import { NOTIFICATION_CHANNEL, redisPub } from 'src/config/redis.config';
import { notificationSchema } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly CHUNK_SIZE = 300;

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUES.NOTIFICATION) private readonly notificationQueue: Queue,
  ) {}

  /**
   * Create a single notification (if allowed by settings) and queue it
   */
  async createAndQueueNotification(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
      image?: string;
    },
  ) {
    const settings = await this.prisma.notificationsSettings.findUnique({
      where: { userId },
    });

    if (settings) {
      const parsedSettings = notificationsSettingsSchema.parse(settings);
      if (!this.isNotificationEnabled(data.type, parsedSettings)) {
        this.logger.debug(
          `🚫 Skipped notification of type ${data.type} for user ${userId}`,
        );
        return;
      }
    }
    this.notificationQueue.add('notify-user', { userId, ...data });
    this.logger.debug(`📨 Queued notification for user ${userId}`);
    return { ok: true };
  }

  async notificationQueueListener(job: any) {
    const { userId, title, message, type, link, image } = job.data;
    this.logger.log(`Processing notification job ${job.id} for user ${userId}`);

    const record = await this.prisma.notification.create({
      data: { userId, title, message, type, link, image },
    });

    // publish to redis pubsub for realtime gateway
    await redisPub.publish(NOTIFICATION_CHANNEL, JSON.stringify(record));

    this.logger.log(`Notification saved and published for user ${userId}`);

    return { ok: true };
  }

  /**
   * Send a notification to all users in chunks
   */
  async fanoutNotification(data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    image?: string;
  }) {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    if (!users.length) {
      this.logger.warn(`⚠ No users found for fanout notification`);
      return;
    }

    this.logger.log(`🚨 Sending notification to ${users.length} users`);

    for (let i = 0; i < users.length; i += this.CHUNK_SIZE) {
      const chunk = users.slice(i, i + this.CHUNK_SIZE);

      await this.notificationQueue.addBulk(
        chunk.map(({ id }) => ({
          name: 'notify-user',
          data: { userId: id, ...data },
        })),
      );
    }
  }

  /**
   * Check if a notification type is enabled for the user
   */
  private isNotificationEnabled(
    type: NotificationType,
    settings: Record<string, boolean>,
  ): boolean {
    const map: Record<NotificationType, boolean> = {
      BOOKING: settings.newBooking,
      REVIEW: settings.newreview,
      PAYMENT: settings.payoutcompleted || settings.payoutintiated,
      ALERT: settings.securityalert,
      SYSTEM: settings.policychange,
      MESSAGE: true,
      COUPON: settings.promotionaloffer,
      WISHLIST: settings.tipsforhost,
      EVENT: settings.bookingreminder,
      NOTIFY: true,
    };
    return map[type] ?? true;
  }

  /**
   * Get paginated notifications for a user
   */
  async getByUser(userId: string, query: any) {
    if (!userId) throw new NotFoundException('User does not exist');

    const parseResult = NotificationQuerySchema.safeParse(query);
    if (!parseResult.success) {
      throw new NotAcceptableException(parseResult.error.errors);
    }

    const { cursor, limit = '10' } = parseResult.data;

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        cursor: cursor ? { id: cursor } : undefined,
        take: parseInt(limit),
        skip: cursor ? 1 : 0,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data: notifications,
      total,
      cursor:
        notifications.length > 0
          ? notifications[notifications.length - 1].id
          : null,
    };
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(id: string, data: any) {
    const parseResult = notificationSchema.safeParse(data);
    if (!parseResult.success) {
      throw new NotAcceptableException(parseResult.error.errors);
    }

    if (
      parseResult.data.type === 'SYSTEM' ||
      parseResult.data.type === 'NOTIFY' ||
      parseResult.data.type === 'ALERT'
    ) {
      await this.fanoutNotification(parseResult.data);
      return {
        status: true,
        message: 'Notification sent successfully',
      };
    }

    const notification = parseResult.data;
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');

    await this.createAndQueueNotification(id, notification);

    return {
      status: true,
      message: 'Notification sent successfully',
    };
  }

  /**
   *
   */

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string) {
    const result = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, readAt: true },
    });

    if (!result) {
      throw new NotAcceptableException('Notification not found');
    }

    if (result.readAt) {
      throw new NotAcceptableException('Notification already read');
    }

    await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return {
      status: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId },
      data: { readAt: new Date() },
    });
    return {
      status: true,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Clear all notifications for a user
   */
  async clearNotifications(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    if (!result.count) {
      throw new NotAcceptableException('No notifications found');
    }

    return {
      status: true,
      deletedCount: result.count,
    };
  }
}
