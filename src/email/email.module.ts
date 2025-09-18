import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmailProcessor } from './email.processor';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from 'src/queues/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUES.EMAIL }), PrismaModule],
  controllers: [EmailController],
  providers: [EmailProcessor, EmailService],
  exports: [EmailService],
})
export class EmailModule {}
