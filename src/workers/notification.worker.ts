import { NestFactory } from '@nestjs/core';
import { NotificationModule } from 'src/notification/notification.module';
import { Logger } from '@nestjs/common';
import { NotificationProcessor } from 'src/notification/notification.processor';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(NotificationModule);

  // ✅ Trigger the worker so it starts listening to the queue
  app.get(NotificationProcessor);

  const logger = new Logger('NotificationWorker');
  logger.log('🚀 Notification worker started');
}
bootstrap();
