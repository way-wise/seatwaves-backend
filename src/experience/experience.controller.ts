// controller/experience.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { CreateExperienceDto, createExperienceDto } from './dto/experience.dto';
import { ExperienceService } from './experience.service';

import { AuthGuard } from '@nestjs/passport';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ExperienceStatus } from '@prisma/client';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import {
  InitializeExperienceDto,
  initializeExperienceSchema,
} from './dto/experience.create.dto';

@Controller('experiences')
// @UseGuards(AuthGuard, RoleGuard)
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.create')
  @Post()
  @UsePipes(new ZodValidationPipe(initializeExperienceSchema))
  async createExperience(@Body() body: InitializeExperienceDto, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.experienceService.experienceCreate(body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.update')
  @Put('/media')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 5 }]))
  async uploadMedia(
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Body() body: any,
    @Req() req: any,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.experienceService.uploadMedia(
      req.user.userId,
      body,
      files?.files || [],
    );
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.read')
  @Get('/media/:id')
  async getMedia(@Param('id') id: string) {
    return this.experienceService.getMedia(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.update')
  @Delete('/media/:id')
  @UseInterceptors(FileInterceptor('file'))
  async deleteMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.experienceService.deleteMedia(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.update')
  @Put(':id')
  async updateExperience(
    @Param('id') id: string,
    @Query() query: any,
    @Body() body: any,
    @Req() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.experienceService.updateExperience(
      id,
      body,
      query,
      req.user.userId,
    );
  }

  // ✅ Host - Create Experience
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.create')
  @Post('/create')
  @UsePipes(new ZodValidationPipe(createExperienceDto))
  async create(@Body() body: CreateExperienceDto, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.experienceService.create(body, req.user.userId);
  }

  // ✅ Admin - Get all experiences
  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @Permissions('experience.read')
  @Get('/admin')
  async findAllAdmin(@Query() query: any) {
    return this.experienceService.findAdminAllExperience(query);
  }

  // // ✅ Admin - Export experiences with same filters as list
  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @Permissions('experience.read')
  // @Get('/admin/export')
  // async exportAllAdmin(@Query() query: any) {
  //   return this.experienceService.exportAdminExperiences(query);
  // }

  // ✅ Admin - Get all experiences by user
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.read')
  @Get('/admin/users/:id')
  async findAllAdminByUser(@Param('id') id: string, @Query() query: any) {
    return this.experienceService.findAllAdminByUser(id, query);
  }

  // ✅ Host - Get experiences by host
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('host.experiences.view')
  @Get('/host')
  async findAllByHost(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.experienceService.findAllByHost(req.user.userId, query);
  }

  // ✅ Public - Get all active experiences
  @Get()
  async findAll(@Query() query: any) {
    return this.experienceService.findAll(query);
  }

  // Host - Get Host Booking For App with Cursor pagination

  @Get('/public')
  async findAllPublic(@Query() query: any) {
    return this.experienceService.findAllPublic(query);
  }

  // Get Public Hot Experiences
  @Get('/public/hot')
  async findHotExperiences(@Query() query: any) {
    return this.experienceService.findHotExperiences(query);
  }

  // Get Public explor page
  @Get('/public/explorer')
  async findExplorer(@Query() query: any) {
    return this.experienceService.findExploreExperiences(query);
  }

  @Get('/public/search')
  async searchExperiences(@Query() query: any) {
    return this.experienceService.experienceSearch(query);
  }
  //Get Experience By Location lattitude and longitude
  @Get('/location')
  async findByLocation(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: any,
  ) {
    return this.experienceService.findByLocation(latitude, longitude, radius);
  }
  //Get Single Experience
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async getExperienceById(@Param('id') id: string, @Req() req) {
    return this.experienceService.getExperienceById(id, req);
  }

  // ✅ Public - Get experience by slug
  @Get('/public/slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.experienceService.findPublicBySlug(slug);
  }

  //Get Experience Media
  // @Get('/public/media/:id')
  // async getPublicMedia(@Param('id') id: string, @Query('type') type: string) {
  //   return this.experienceService.getPublicMedia(id, type);
  // }

  // ✅ Admin - Soft delete experience
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.delete')
  async remove(@Param('id') id: string) {
    return this.experienceService.remove(id);
  }

  // ✅ Admin - Toggle status (e.g., approve/reject)
  @Put('status/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.verify')
  async toggleStatus(
    @Param('id') id: string,
    @Body('status') status: ExperienceStatus,
    @Body('message') message?: string,
  ) {
    return this.experienceService.toggleStatus(id, status, message);
  }

  // ✅ Host Submit to Admin Experience
  @Patch('/submit-to-admin/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.update')
  async submitToAdmin(@Req() req, @Param('id') id: string) {
    console.log('req.user', req.user);
    return this.experienceService.submitToAdmin(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('experience.update')
  @Get('/admin/update-cover-image')
  async updateAllCoverImage() {
    return this.experienceService.updateAllCoverImage();
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions('experience.read')
  @Get('/available/host')
  async getAvailableExperiences(@Req() req) {
    return this.experienceService.getAvailableExperiences(req.user.userId);
  }

  @Get('/admin/generate-recurring-events')
  async generateRecurringEvents() {
    return this.experienceService.generateRecurringEvents();
  }

  @Get('/admin/featured-experiences')
  async getFeaturedExperiences(@Query() query: any) {
    return this.experienceService.getFeaturedExperiences(query);
  }

  @Post('/admin/featured-experiences/:id')
  async addFeaturedExperience(@Param('id') id: string) {
    return this.experienceService.addFeaturedExperience(id);
  }

  @Delete('/admin/featured-experiences/:id')
  async removeFeaturedExperience(@Param('id') id: string) {
    return this.experienceService.removeFeaturedExperience(id);
  }
}
