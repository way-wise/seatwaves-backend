import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

import { WebhookEventStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUES } from 'src/queues/queue.constants';

// Simple retention defaults
const REDIS_CLEAN_RETENTION_DAYS_DEFAULT = 7; // clean jobs older than 7 days
const WEBHOOK_PROCESSED_RETENTION_DAYS_DEFAULT = 30; // keep processed webhooks 30 days
const NOTIFICATION_RETENTION_DAYS_DEFAULT = 180; // remove read notifications older than 180 days
const LOGIN_HISTORY_RETENTION_DAYS_DEFAULT = 365; // remove login history older than 1 year

@Injectable()
export class TasksService implements OnModuleDestroy {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(QUEUES.EVENT) private readonly eventQueue: Queue,
  ) {
    this.logger.log(
      `TasksService initialized (cron jobs: redis clean, project clean)`,
    );
  }

  /**
   * Redis cleaning cron: cleans completed/failed BullMQ jobs older than retention window.
   * Runs daily at 03:00.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanRedisQueue() {
    try {
      const retentionDays = Number(
        this.configService.get('REDIS_CLEAN_RETENTION_DAYS') ??
          REDIS_CLEAN_RETENTION_DAYS_DEFAULT,
      );
      const graceMs = retentionDays * 24 * 60 * 60 * 1000;

      // Clean completed and failed jobs
      const cleanedCompleted: any = await (this.eventQueue.clean as any)(
        graceMs,
        1000,
        'completed',
      );
      const cleanedFailed: any = await (this.eventQueue.clean as any)(
        graceMs,
        1000,
        'failed',
      );
      const completedCount = Array.isArray(cleanedCompleted)
        ? cleanedCompleted.length
        : Number(cleanedCompleted || 0);
      const failedCount = Array.isArray(cleanedFailed)
        ? cleanedFailed.length
        : Number(cleanedFailed || 0);

      this.logger.log(
        `Redis queue cleaned: completed=${completedCount}, failed=${failedCount}, retentionDays=${retentionDays}`,
      );
    } catch (error) {
      this.logger.error('Redis cleaning failed', (error as Error)?.stack);
    }
  }

  /**
   * Project cleanup cron: remove expired OTPs, old processed webhooks, old notifications, login history.
   * Runs daily at 03:30.
   */
  @Cron('30 3 * * *')
  async projectCleanup() {
    try {
      const now = new Date();
      const webhookRetentionDays = Number(
        this.configService.get('WEBHOOK_PROCESSED_RETENTION_DAYS') ??
          WEBHOOK_PROCESSED_RETENTION_DAYS_DEFAULT,
      );
      const notifRetentionDays = Number(
        this.configService.get('NOTIFICATION_RETENTION_DAYS') ??
          NOTIFICATION_RETENTION_DAYS_DEFAULT,
      );
      const loginRetentionDays = Number(
        this.configService.get('LOGIN_HISTORY_RETENTION_DAYS') ??
          LOGIN_HISTORY_RETENTION_DAYS_DEFAULT,
      );

      const webhookCutoff = new Date(
        now.getTime() - webhookRetentionDays * 24 * 60 * 60 * 1000,
      );
      const notifCutoff = new Date(
        now.getTime() - notifRetentionDays * 24 * 60 * 60 * 1000,
      );
      const loginCutoff = new Date(
        now.getTime() - loginRetentionDays * 24 * 60 * 60 * 1000,
      );

      const [otpDel, webhooksDel, notifDel, loginDel] =
        await this.prisma.$transaction([
          this.prisma.userOtp.deleteMany({ where: { expiresAt: { lt: now } } }),
          this.prisma.webhookEvent.deleteMany({
            where: {
              status: WebhookEventStatus.PROCESSED,
              processedAt: { lt: webhookCutoff },
            },
          }),
          this.prisma.notification.deleteMany({
            where: { readAt: { lt: notifCutoff } },
          }),
          this.prisma.loginHistory.deleteMany({
            where: { createdAt: { lt: loginCutoff } },
          }),
        ]);

      this.logger.log(
        `Project cleanup completed: otp=${otpDel.count}, webhooks=${webhooksDel.count}, notifications=${notifDel.count}, loginHistory=${loginDel.count}`,
      );
    } catch (error) {
      this.logger.error('Project cleanup failed', (error as Error)?.stack);
    }
  }

  async onModuleDestroy() {
    this.logger.log('TasksService shutting down...');
    // No worker to close - EventProcessor handles queue consumption
  }
}
