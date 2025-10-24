import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('notification.read')
  @Get('me')
  getMyNotifications(@Req() req, @Query() query: any) {
    return this.service.getByUser(req.user.userId, query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('notification.create')
  @Post('/:id/send')
  sendNotification(@Param('id') id: string, @Body() body: any) {
    return this.service.sendNotification(id, body);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('notification.update')
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('notification.update')
  @Patch('mark-all-read')
  markAllAsRead(@Req() req) {
    return this.service.markAllAsRead(req.user.userId);
  }
}
