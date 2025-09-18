// src/notification/notification.module.ts
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationProcessor } from './notification.processor';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from 'src/queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.NOTIFICATION }),
    PrismaModule,
  ], // PrismaService is provided by PrismaModule
  providers: [
    NotificationProcessor, // 👈 will run inside worker context only
    NotificationService,
    NotificationGateway,
  ],
  controllers: [NotificationController],
  exports: [NotificationService], // for other modules if needed
})
export class NotificationModule {}
