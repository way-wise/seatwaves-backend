import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from 'src/queues/queue.constants';
import { WebhookProcessor } from './webhook.processor';
import { NotificationModule } from 'src/notification/notification.module';
import { ActivityModule } from 'src/activity/activity.module';
import { PointsModule } from 'src/points/points.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: QUEUES.WEBHOOK }),
    NotificationModule,
    ActivityModule,
    PointsModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookProcessor],
  exports: [WebhookService],
})
export class WebhookModule {}
