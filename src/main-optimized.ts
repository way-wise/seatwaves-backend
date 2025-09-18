import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppOptimizedModule } from './app-optimized.module';
import { AllExceptionsFilter } from './common/exceptions/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppOptimizedModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Trust proxy for proper IP detection
    // app.set('trust proxy', 1);

    // Cookie parser for session management
    app.use(cookieParser());

    // Enhanced CORS configuration
    app.enableCors({
      origin: [
        process.env.APP_CLIENT_URL,
        'http://localhost:3000',
        'https://weout.waywisetech.com',
        /^https:\/\/.*\.weout\.com$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
      ],
      credentials: true,
      maxAge: 86400, // 24 hours preflight cache
    });

    // Global validation pipe with enhanced options
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        validateCustomDecorators: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    // Global exception filter
    app.useGlobalFilters(new AllExceptionsFilter());

    // Global logging interceptor
    app.useGlobalInterceptors(new LoggingInterceptor());

    // API versioning
    app.setGlobalPrefix('api/v1');

    // Swagger documentation (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('WeOut API')
        .setDescription('WeOut marketplace API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('auth', 'Authentication endpoints')
        .addTag('users', 'User management')
        .addTag('experiences', 'Experience management')
        .addTag('bookings', 'Booking management')
        .addTag('payments', 'Payment processing')
        .addTag('admin', 'Admin operations')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });
    }

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.log('SIGTERM received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.log('SIGINT received, shutting down gracefully');
      await app.close();
      process.exit(0);
    });

    const port = process.env.PORT || 8000;
    await app.listen(port);
    
    logger.log(`🚀 WeOut API is running on port ${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
