import { Module } from '@nestjs/common';
import { AmenityController } from './amenity.controller';
import { AmenityService } from './amenity.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [AmenityController],
  providers: [AmenityService],
})
export class AmenityModule {}
