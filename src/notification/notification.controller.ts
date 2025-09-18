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

@Controller('notifications')
export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMyNotifications(@Req() req, @Query() query: any) {
    return this.service.getByUser(req.user.userId, query);
  }

  @Post('/:id/send')
  @UseGuards(AuthGuard('jwt'))
  sendNotification(@Param('id') id: string, @Body() body: any) {
    return this.service.sendNotification(id, body);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'))
  markAsRead(@Param('id') id: string) {
    return this.service.markAsRead(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('mark-all-read')
  markAllAsRead(@Req() req) {
    return this.service.markAllAsRead(req.user.userId);
  }
}
