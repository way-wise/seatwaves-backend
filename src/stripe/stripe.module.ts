import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TransactionModule } from '../transaction/transaction.module';
import { NotificationModule } from '../notification/notification.module';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TransactionModule,
    NotificationModule,
    ActivityModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService], // Export for use in other modules
})
export class StripeModule {}
