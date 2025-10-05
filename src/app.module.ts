import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
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
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CommonModule,
    // ScheduleModule.forRoot(),
    UploadModule,
    AuthModule,
    UsersModule,
    RoleModule,
    CategoryModule,
    EventModule,
    DashboardModule,
    // ExperienceModule,
    BookingModule,
    // ReviewModule,
    // MessageModule,
    // CategoryModule,
    // WishlistModule,
    // EventModule,
    // AmenityModule,
    // BlogModule,
    StripeModule,
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
  providers: [AppService, PrismaService],
})
export class AppModule {}
