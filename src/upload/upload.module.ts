import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  providers: [ConfigService, UploadService],
  controllers: [UploadController],
  exports: [UploadService],
})
export class UploadModule {}
