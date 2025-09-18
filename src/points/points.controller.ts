import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { PointsService } from './points.service';
import { PointRuleAction } from '@prisma/client';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { createRuleSchema } from './dto/rules.create.dto';
import { AwardPointsDto, awardPointsSchema } from './dto/award.create.dto';
import { RedeemPointsDto, redeemPointsSchema } from './dto/redeem.create.dto';

@Controller('points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  // Rules
  //   @Permissions('points.read')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Get('rules')
  getRules() {
    return this.points.getRules();
  }

  @Permissions('points.create')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @UsePipes(new ZodValidationPipe(createRuleSchema))
  @Post('rules')
  createRule(@Body() body: any) {
    return this.points.createRule(body as any);
  }

  @Patch('rules/:id')
  @Permissions('points.update')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  updateRule(@Param('id') id: string, @Body() body: any) {
    return this.points.updateRule(id, body);
  }

  // Award and redeem
  @Permissions('points.award')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @UsePipes(new ZodValidationPipe(awardPointsSchema))
  @Post('award')
  award(
    @Body()
    body: AwardPointsDto,
  ) {
    return this.points.awardPoints(body);
  }

  // get all reward points\
  @Permissions('points.read')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Get('reward-points')
  getRewardPoints(@Query() query: any) {
    return this.points.getRewardPoints(query);
  }

  @Permissions('points.redeem')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @UsePipes(new ZodValidationPipe(redeemPointsSchema))
  redeem(
    @Body()
    body: RedeemPointsDto,
  ) {
    return this.points.redeemPoints(body);
  }

  // User views
  @Get(':userId/balance')
  balance(@Param('userId') userId: string) {
    return this.points.getBalance(userId);
  }

  @Get(':userId/history')
  history(@Param('userId') userId: string) {
    return this.points.getHistory(userId);
  }

  @Post(':userId/recalc-tier')
  recalcTier(@Param('userId') userId: string) {
    return this.points.recalcTier(userId);
  }

  // Expiration job trigger (admin/cron)
  @Post('expire')
  expire(@Query('limit') limit?: string) {
    const n = limit ? Number(limit) : undefined;
    return this.points.expireJob(n);
  }
}
