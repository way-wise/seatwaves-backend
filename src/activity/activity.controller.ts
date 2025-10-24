import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  // Admin-only: list activities with filters
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('admin.activity.view')
  @Get('admin')
  async list(@Query() query: any) {
    return this.activityService.list(query);
  }
}
