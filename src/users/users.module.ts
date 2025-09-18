import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';
import { NotificationModule } from 'src/notification/notification.module';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [PrismaModule, UploadModule, NotificationModule, EmailModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
