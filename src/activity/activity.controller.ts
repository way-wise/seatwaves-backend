import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // Admin-only: list activities with filters
  @Get('admin')
  @UseGuards(AuthGuard('jwt'))
  async list(@Query() query: any) {
    return this.activityService.list(query);
  }
}
