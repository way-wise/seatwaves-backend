// import { Module } from '@nestjs/common';
// import { EventService } from './event.service';
// import { EventController } from './event.controller';
// import { PrismaModule } from 'src/prisma/prisma.module';
// import { NotificationModule } from 'src/notification/notification.module';
// import { EventProcessor } from './events.processor';
// import { BullModule } from '@nestjs/bullmq';
// import { QUEUES } from 'src/queues/queue.constants';

// @Module({
//   imports: [
//     BullModule.registerQueue({ name: QUEUES.EVENT }),
//     PrismaModule,
//     NotificationModule,
//   ],
//   controllers: [EventController],
//   providers: [EventProcessor, EventService],
//   exports: [EventService],
// })
// export class EventModule {}
