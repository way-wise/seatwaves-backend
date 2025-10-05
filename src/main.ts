import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: true,
  });

  app.use(cookieParser());

  //CORS ENABLE
  app.enableCors({
    origin: ['*'], // Replace with your frontend's URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // Enable cookies and credentials
  });

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
