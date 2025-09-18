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

  // ===== Privacy Policy =====
  @Get('privacypolicy')
  getPrivacyPolicyAdmin() {
    return this.contentService.getPrivacyPolicyAdmin();
  }

  @Get('/privacypolicy/public')
  getPrivacyPolicyPublic() {
    return this.contentService.getPrivacyPolicy();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('privacypolicy')
  @UseInterceptors(FileInterceptor('ogImage'))
  createPrivacyPolicy(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createPrivacyPolicy(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('privacypolicy/:id')
  @UseInterceptors(FileInterceptor('ogImage'))
  updatePrivacyPolicy(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updatePrivacyPolicy(id, body, file);
  }

  // ===== Terms and Service =====
  @Get('termsandservice')
  getTermsAndServiceAdmin() {
    return this.contentService.getTermsAndServiceAdmin();
  }

  @Get('/termsandservice/public')
  getTermsAndServicePublic() {
    return this.contentService.getTermsAndService();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('termsandservice')
  @UseInterceptors(FileInterceptor('ogImage'))
  createTermsAndService(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createTermsAndService(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('termsandservice/:id')
  @UseInterceptors(FileInterceptor('ogImage'))
  updateTermsAndService(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateTermsAndService(id, body, file);
  }

  // ===== Trust and Safety =====
  @Get('trustandsafety')
  getTrustAndSafetyAdmin() {
    return this.contentService.getTrustAndSafetyAdmin();
  }

  @Get('/trustandsafety/public')
  getTrustAndSafetyPublic() {
    return this.contentService.getTrustAndSafety();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('trustandsafety')
  @UseInterceptors(FileInterceptor('ogImage'))
  createTrustAndSafety(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createTrustAndSafety(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('trustandsafety/:id')
  @UseInterceptors(FileInterceptor('ogImage'))
  updateTrustAndSafety(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateTrustAndSafety(id, body, file);
  }

  // ===== Community Guidelines =====
  @Get('communityguidelines')
  getCommunityGuidelinesAdmin() {
    return this.contentService.getCommunityGuidelinesAdmin();
  }

  @Get('/communityguidelines/public')
  getCommunityGuidelinesPublic() {
    return this.contentService.getCommunityGuidelines();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('communityguidelines')
  @UseInterceptors(FileInterceptor('ogImage'))
  createCommunityGuidelines(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createCommunityGuidelines(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('communityguidelines/:id')
  @UseInterceptors(FileInterceptor('ogImage'))
  updateCommunityGuidelines(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateCommunityGuidelines(id, body, file);
  }

  // ===== Cancellation Policy =====
  @Get('cancellationpolicy')
  getCancellationPolicyAdmin() {
    return this.contentService.getCancellationPolicyAdmin();
  }

  @Get('/cancellationpolicy/public')
  getCancellationPolicyPublic() {
    return this.contentService.getCancellationPolicy();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('cancellationpolicy')
  @UseInterceptors(FileInterceptor('ogImage'))
  createCancellationPolicy(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.createCancellationPolicy(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('cancellationpolicy/:id')
  @UseInterceptors(FileInterceptor('ogImage'))
  updateCancellationPolicy(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateCancellationPolicy(id, body, file);
  }

  // ===== Career =====
  @Get('career')
  getCareerAdmin() {
    return this.contentService.getCareerAdmin();
  }

  @Get('/career/public')
  getCareerPublic() {
    return this.contentService.getCareer();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.create')
  @Post('career')
  @UseInterceptors(FileInterceptor('ogImage'))
  createCareer(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    return this.contentService.createCareer(body, file);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('content.update')
  @Put('career/:id')
  @UseInterceptors(FileInterceptor('ogImage'))
  updateCareer(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.contentService.updateCareer(id, body, file);
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
