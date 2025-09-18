import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingModule } from './booking/booking.module';
import { CategoryModule } from './category/category.module';
import { ExperienceModule } from './experience/experience.module';
import { MessageModule } from './message/message.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReviewModule } from './review/review.module';
import { UsersModule } from './users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { WishlistModule } from './wishlist/wishlist.module';
import { EventModule } from './event/event.module';
import { AmenityModule } from './amenity/amenity.module';
import { UploadModule } from './upload/upload.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { RoleModule } from './role/role.module';
import { BlogModule } from './blog/blog.module';
import { StripeModule } from './stripe/stripe.module';
import { NotificationModule } from './notification/notification.module';
import { EmailModule } from './email/email.module';
import { BullModule } from '@nestjs/bullmq';
import { redisConfig } from './config/redis.config';
import { QUEUES } from './queues/queue.constants';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardModule } from './dashboard/dashboard.module';
import { CouponModule } from './coupon/coupon.module';
import { TransactionModule } from './transaction/transaction.module';
import { WebhookModule } from './webhook/webhook.module';
import { HelpModule } from './help/help.module';
import { ReelsModule } from './reels/reels.module';
import { FeedbackModule } from './feedback/feedback.module';
import { CommonModule } from './common/common.module';
import { ContentModule } from './content/content.module';
import { ActivityModule } from './activity/activity.module';
import { PointsModule } from './points/points.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: redisConfig,
    }),
    BullModule.registerQueue(
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.EMAIL },
      { name: QUEUES.EVENT },
      { name: QUEUES.WEBHOOK },
    ),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
      global: true,
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    ScheduleModule.forRoot(),
    UploadModule,
    AuthModule,
    UsersModule,
    ExperienceModule,
    BookingModule,
    ReviewModule,
    MessageModule,
    CategoryModule,
    WishlistModule,
    EventModule,
    AmenityModule,
    RoleModule,
    BlogModule,
    StripeModule,
    TransactionModule,
    NotificationModule,
    EmailModule,
    TasksModule,
    DashboardModule,
    CouponModule,
    WebhookModule,
    HelpModule,
    ReelsModule,
    FeedbackModule,
    ContentModule,
    ActivityModule,
    PointsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
