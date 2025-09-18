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
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ZodValidationPipe } from '../common/zodValidationPipe';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { createInterestSchema } from './dto/interest.dto';
import { UpdateUserDto, updateUserSchema } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Permissions('user.read', 'admin.user.view')
  @Get()
  findAll(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions('user.update')
  @Patch('profile')
  @UsePipes(new ZodValidationPipe(updateUserSchema))
  updateProfile(@Req() req, @Body() body: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.userId, body);
  }
  @Post('profile/interests')
  @UseGuards(AuthGuard('jwt'))
  @UsePipes(new ZodValidationPipe(createInterestSchema))
  updateInterests(@Req() req, @Body() body: any) {
    return this.usersService.interests(req.user.userId, body);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    return this.usersService.updateAvatar(id, file, req.user.userId);
  }

  @Patch('/toggle-two-factor')
  @UseGuards(AuthGuard('jwt'))
  toggleTwoFactor(@Req() req) {
    return this.usersService.toggleTwoFactor(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('user.status')
  @Patch(':id/status')
  adminUpdateUser(@Param('id') id: string, @Body() body: AdminUpdateUserDto) {
    return this.usersService.toggleStatus(id, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  deleteUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.deleteUser(id, body);
  }

  //HOST ENDPOINTS

  //HOST Verification details
  @UseGuards(AuthGuard('jwt'))
  @Post('/profile/:id/business-verify')
  @UseInterceptors(FilesInterceptor('documents', 5))
  verifyHost(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Param('id') id: string,
  ) {
    console.log('Params', id);
    return this.usersService.verifyHost(id, body, files || []);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/profile/:id/business-verify')
  @UseInterceptors(FilesInterceptor('documents', 5))
  updateBusinessInfo(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Param('id') id: string,
  ) {
    return this.usersService.updateBusinessInfo(id, body, files || []);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/profile/:id/business-verify')
  getBusinessInfo(@Param('id') id: string) {
    return this.usersService.getBusinessInfo(id);
  }
  //Admin Endpoints

  //get all submitted host verification
  @Get('/admin/verification')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('admin.verification.view')
  getAllVerification(@Query() query: any) {
    return this.usersService.getAllSubmittedVerification(query);
  }

  @Get('/admin/verification/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('verification.read', 'admin.verification.view')
  getVerification(@Param('id') id: string) {
    return this.usersService.getVerification(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('verification.update')
  @Patch('/admin/verification/:id')
  updateVerification(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateBusinessInfoStatus(
      id,
      body.status,
      body.message,
    );
  }

  //Put Notification Settings
  @Put('/profile/notification')
  @UseGuards(AuthGuard('jwt'))
  updateNotificationSettings(@Req() req, @Body() body: any) {
    return this.usersService.updateNotificationSettings(req.user.userId, body);
  }

  // Get Notification Settings
  @Get('/profile/notification')
  @UseGuards(AuthGuard('jwt'))
  getNotificationSettings(@Req() req) {
    return this.usersService.getNotificationSettings(req.user.userId);
  }
}
