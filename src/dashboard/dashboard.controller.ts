import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
// @UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Permissions('host.dashboard.view')
  @Get()
  async getDashboard(@Req() req, @Query() query: any) {
    return this.dashboardService.getDashboardData(req.user.userId, query);
  }

  @Permissions('host.earnings.view')
  @Get('/host/earnings')
  async getHostEarnings(@Req() req, @Query() query: any) {
    return this.dashboardService.getHostEarnings(req.user.userId, query);
  }

  @Permissions('host.calendar.view')
  @Get('/host/calendar')
  async getHostCalendar(@Req() req, @Query() query: any) {
    return this.dashboardService.getHostCalendar(req.user.userId, query);
  }

  //   @Permissions('admin.dashboard.view')
  @Get('/admin/dashboard')
  async getAdminDashboard(@Query() query: any) {
    return this.dashboardService.getAdminDashboard(query);
  }

   //admin balance
   @Permissions('admin.balance.view')
   @Get('/admin/balance')
   async getAdminBalance(@Query() query: any) {
     return this.dashboardService.getAdminBalance(query);
   }
}
