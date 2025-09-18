import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationModule } from 'src/notification/notification.module';
import { EmailModule } from 'src/email/email.module';
import { StripeModule } from 'src/stripe/stripe.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
      global: true,
    }),
    PrismaModule,
    NotificationModule,
    EmailModule,
    StripeModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
