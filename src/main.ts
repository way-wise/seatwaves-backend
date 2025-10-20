import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/exceptions/http-exception.filter';
import { validateEnv } from './config/env.config';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment variables on startup
  try {
    validateEnv(process.env);
    logger.log('Environment variables validated successfully');
  } catch (error) {
    logger.error('Environment validation failed:', error.message);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Security: Helmet for HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Cookie parser
  app.use(cookieParser());

  // Global interceptors
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new LoggingInterceptor(),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS with proper origin handling
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_CLIENT_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  if (allowedOrigins.length === 1 && allowedOrigins[0] === 'http://localhost:3000') {
    logger.warn(
      'No production CORS origins configured. Using localhost only. Set FRONTEND_URL or APP_CLIENT_URL in production.',
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Idempotency-Key',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('SeatWaves API')
    .setDescription('SeatWaves Backend API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Events')
    .addTag('Bookings')
    .addTag('Stripe Webhooks')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 8000;
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/v1/docs`);
  logger.log(`💚 Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
