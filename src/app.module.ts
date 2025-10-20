import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { redisConfig } from './config/redis.config';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { QUEUES } from './queues/queue.constants';
import { RoleModule } from './role/role.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { CategoryModule } from './category/category.module';
import { EventModule } from './event/event.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BookingModule } from './booking/booking.module';
import { StripeModule } from './stripe/stripe.module';
import { MessageModule } from './message/message.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { ReviewModule } from './review/review.module';
import { TasksModule } from './tasks/tasks.module';
import { ScheduleModule } from '@nestjs/schedule';
import { HelpModule } from './help/help.module';
import { FeedbackModule } from './feedback/feedback.module';
import { WebhookModule } from './webhook/webhook.module';
import { ReportsModule } from './reports/reports.module';
import { HealthModule } from './health/health.module';
@Module({
  imports: [
    // Serve local files under storage/ at /storage/*
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'storage'),
      // Serve under the same global prefix path
      serveRoot: '/api/v1/storage',
    }),
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
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      cache: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
        limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
      },
    ]),
    PrismaModule,
    CommonModule,
    ScheduleModule.forRoot(),
    UploadModule,
    AuthModule,
    UsersModule,
    RoleModule,
    CategoryModule,
    EventModule,
    DashboardModule,
    MessageModule,
    BookingModule,
    WishlistModule,
    ReviewModule,
    TasksModule,
    HelpModule,
    FeedbackModule,
    WebhookModule,
    // CategoryModule,
    // WishlistModule,
    // EventModule,
    // BlogModule,
    StripeModule,
    ReportsModule,
    HealthModule,
    // TransactionModule,
    // NotificationModule,
    // EmailModule,
    // TasksModule,
    // DashboardModule,
    // CouponModule,
    // WebhookModule,
    // HelpModule,
    // ReelsModule,
    // FeedbackModule,
    // ContentModule,
    // ActivityModule,
    // PointsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
