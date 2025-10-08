import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ZodQueryValidationPipe } from 'src/common/zodQueryValidationPipe';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { ReportsService } from './reports.service';
import { CreateReportDto, createReportSchema } from './dto/create-report.dto';
import { ReportQueryDto, reportQuerySchema } from './dto/query.dto';
import {
  AssignReportDto,
  assignReportSchema,
  UpdateNotesDto,
  updateNotesSchema,
  UpdateReportStatusDto,
  updateReportStatusSchema,
} from './dto/manage.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Create a report (authenticated)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.create')
  @UsePipes(new ZodValidationPipe(createReportSchema))
  @Post()
  create(@Body() body: CreateReportDto, @Req() req) {
    return this.reportsService.create(body, req.user.userId);
  }

  // Admin: list all reports
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.read')
  @Get('admin/all')
  @UsePipes(new ZodQueryValidationPipe(reportQuerySchema))
  findAll(@Query() query: ReportQueryDto) {
    return this.reportsService.listAll(query);
  }

  // Reporter: list my reports
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.read')
  @Get('mine')
  @UsePipes(new ZodQueryValidationPipe(reportQuerySchema))
  findMine(@Req() req, @Query() query: ReportQueryDto) {
    return this.reportsService.listMine(req.user.userId, query);
  }

  // Get single report
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.getById(id);
  }

  // Assign report to self or another admin
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.update')
  @UsePipes(new ZodValidationPipe(assignReportSchema))
  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() body: AssignReportDto, @Req() req) {
    return this.reportsService.assign(id, body, req.user.userId);
  }

  // Update report status
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.update')
  @UsePipes(new ZodValidationPipe(updateReportStatusSchema))
  @Put(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateReportStatusDto,
    @Req() req,
  ) {
    return this.reportsService.updateStatus(id, body, req.user.userId);
  }

  // Update admin notes
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('report.update')
  @UsePipes(new ZodValidationPipe(updateNotesSchema))
  @Put(':id/notes')
  updateNotes(
    @Param('id') id: string,
    @Body() body: UpdateNotesDto,
    @Req() req,
  ) {
    return this.reportsService.updateNotes(id, body, req.user.userId);
  }
}
