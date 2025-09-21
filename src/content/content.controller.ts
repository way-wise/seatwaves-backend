import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { ContentService } from './content.service';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  //site setting
  @Get('site-setting')
  getSiteSetting() {
    return this.contentService.getSiteSetting();
  }

  // ===== Contact Information =====
  @Get('contact')
  getContactInfo() {
    return this.contentService.getContactInfo();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('contact')
  createContactInfo(@Body() body: any) {
    return this.contentService.createContactInfo(body);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('contact/:id')
  updateContactInfo(@Param('id') id: string, @Body() body: any) {
    return this.contentService.updateContactInfo(id, body);
  }

  //Post site setting
  @Post('site-setting')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'siteLogo', maxCount: 1 },
      { name: 'siteFavicon', maxCount: 1 },
    ]),
  )
  createSiteSetting(
    @UploadedFiles()
    files: {
      siteLogo?: Express.Multer.File[];
      siteFavicon?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    return this.contentService.createSiteSetting(body, files);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('site-setting/:id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'siteLogo', maxCount: 1 },
      { name: 'siteFavicon', maxCount: 1 },
    ]),
  )
  updateSiteSetting(
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      siteLogo?: Express.Multer.File[];
      siteFavicon?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    return this.contentService.updateSiteSetting(id, body, files);
  }

  // ===== Hero Section =====
  @Get('hero')
  getHeroSection() {
    return this.contentService.getHeroSectionAdmin();
  }

  //public url
  @Get('/hero/public')
  getHeroSectionPublic() {
    return this.contentService.getHeroSection();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('hero')
  @UseInterceptors(FileInterceptor('image'))
  createHeroSection(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createHeroSection(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('hero/:id')
  @UseInterceptors(FileInterceptor('image'))
  updateHeroSection(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateHeroSection(id, body, file);
  }

  // ===== Testimonial =====
  @Get('testimonials')
  listTestimonials(@Query() query: { page?: string; limit?: string }) {
    return this.contentService.listTestimonials(query);
  }

  //public url
  @Get('/testimonials/public')
  listTestimonialsPublic() {
    return this.contentService.getTestimonials();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('testimonial')
  @UseInterceptors(FileInterceptor('image'))
  createTestimonial(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createTestimonial(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('testimonial/:id')
  @UseInterceptors(FileInterceptor('image'))
  updateTestimonial(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateTestimonial(id, body, file);
  }

  // ===== Banner =====
  @Get('banners')
  getBannersAdmin() {
    return this.contentService.getBannersAdmin();
  }

  @Get('/banners/public')
  getBannersPublic() {
    return this.contentService.getBanners();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('banner')
  @UseInterceptors(FileInterceptor('image'))
  createBanner(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.contentService.createBanner(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('banner/:id')
  @UseInterceptors(FileInterceptor('image'))
  updateBanner(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateBanner(id, body, file);
  }

  // ===== Card =====

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.delete')
  @Delete('card/:id')
  deleteCard(@Param('id') id: string) {
    return this.contentService.deleteCard(id);
  }

  // ===== Dynamic Page =====
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('dynamic-page')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'ogImage', maxCount: 1 },
    ]),
  )
  createDynamicPage(
    @UploadedFiles()
    files: { image?: Express.Multer.File[]; ogImage?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    return this.contentService.createDynamicPage(body, files);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('dynamic-page/:slug')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'ogImage', maxCount: 1 },
    ]),
  )
  updateDynamicPageBySlug(
    @Param('slug') slug: string,
    @UploadedFiles()
    files: { image?: Express.Multer.File[]; ogImage?: Express.Multer.File[] },
    @Body() body: any,
  ) {
    return this.contentService.updateDynamicPageBySlug(slug, body, files);
  }

  // //Card Create
  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @Permissions('content.card.create')
  // @Post('card')
  // @UseInterceptors(FileInterceptor('image'))
  // createCard(
  //   @UploadedFile() file: Express.Multer.File,
  //   @Body() body: any,
  // ) {
  //   return this.contentService.createCard(body, file);
  // }
}
