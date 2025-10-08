// amenity.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AmenityService } from './amenity.service';
import { CreateAmenityDto, UpdateAmenityDto } from './dto/create.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('amenities')
export class AmenityController {
  constructor(private readonly amenityService: AmenityService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('amenity.create')
  @Post()
  @UseInterceptors(FileInterceptor('icon'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createAmenityDto: CreateAmenityDto,
  ) {
    return this.amenityService.create(createAmenityDto, file);
  }

  // @UseGuards(AuthGuard('jwt'))
  // @Permissions('amenity.read')
  @Get()
  async findAll(@Query() query: any) {
    return this.amenityService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('amenity.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.amenityService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('amenity.update')
  @Put(':id')
  @UseInterceptors(FileInterceptor('icon'))
  async update(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateAmenityDto: UpdateAmenityDto,
  ) {
    return this.amenityService.update(id, updateAmenityDto, file);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('amenity.delete')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.amenityService.remove(id);
  }
}
