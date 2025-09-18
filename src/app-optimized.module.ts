import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ValidationPipe } from '@nestjs/common';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExperienceModule } from './experience/experience.module';
import { BookingModule } from './booking/booking.module';
import { StripeModule } from './stripe/stripe.module';
import { TransactionModule } from './transaction/transaction.module';
import { CouponModule } from './coupon/coupon.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationModule } from './notification/notification.module';
import { EmailModule } from './email/email.module';
import { ReviewModule } from './review/review.module';
import { MessageModule } from './message/message.module';
import { CategoryModule } from './category/category.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { EventModule } from './event/event.module';
import { AmenityModule } from './amenity/amenity.module';
import { UploadModule } from './upload/upload.module';
import { RoleModule } from './role/role.module';
import { BlogModule } from './blog/blog.module';

// Global providers
import { AllExceptionsFilter } from './common/exceptions/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RolesGuard } from './common/guards/roles.guard';
import { SecurityMiddleware } from './common/middleware/security.middleware';

// Configuration
import { redisConfig } from './config/redis.config';
import { QUEUES } from './queues/queue.constants';

// Controllers
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HelpModule } from './help/help.module';
import { ReelsModule } from './reels/reels.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ContentModule } from './content/content.module';
import { ActivityModule } from './activity/activity.module';
import { PointsModule } from './points/points.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // JWT Configuration
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
      global: true,
    }),

    // Bull Queue Configuration
    BullModule.forRoot({
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),

    // Queue Registration
    BullModule.registerQueue(
      { name: QUEUES.NOTIFICATION },
      { name: QUEUES.EMAIL },
      { name: QUEUES.EVENT },
    ),

    // Scheduler
    ScheduleModule.forRoot(),

    // Core modules
    PrismaModule,
    CommonModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ExperienceModule,
    BookingModule,
    StripeModule,
    TransactionModule,
    CouponModule,
    DashboardModule,
    TasksModule,
    NotificationModule,
    EmailModule,
    ReviewModule,
    MessageModule,
    CategoryModule,
    WishlistModule,
    EventModule,
    AmenityModule,
    UploadModule,
    RoleModule,
    BlogModule,
    ReelsModule,
    FeedbackModule,
    ContentModule,
    ActivityModule,
    PointsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    
    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    
    // Global roles guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    
    // Global validation pipe
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        validateCustomDecorators: true,
      }),
    },
  ],
})
export class AppOptimizedModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security middleware globally
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
