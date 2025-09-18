import { NestFactory } from '@nestjs/core';
import { EmailModule } from 'src/email/email.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(EmailModule);
  const logger = new Logger('EmailWorker');
  logger.log('🚀 Email worker started');
}
bootstrap();
