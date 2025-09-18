import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EventModule } from 'src/event/event.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from 'src/queues/queue.constants';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.EVENT }),
    PrismaModule,
    EventModule,
    StripeModule,
  ],
  providers: [TasksService],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
