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
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CouponStatus, CouponType } from '@prisma/client';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import {
  CouponFilters,
  CouponService,
  PaginationOptions,
} from './coupon.service';
import {
  CouponQueryDto,
  CouponQuerySchema,
  CreateCouponDto,
  CreateCouponSchema,
  RedeemCouponDto,
  RedeemCouponSchema,
  UpdateCouponDto,
  UpdateCouponSchema,
} from './dto/coupon.schemas';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

// ============= REQUEST DTOs =============
// DTOs are now defined in ./dto/coupon.schemas.ts using Zod schemas

@ApiTags('Coupons')
@Controller('coupons')
@ApiBearerAuth()
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  // ============= COUPON MANAGEMENT =============

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiResponse({ status: 201, description: 'Coupon created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - not experience owner' })
  @ApiResponse({ status: 404, description: 'Experience not found' })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateCouponSchema))
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.create')
  async createCoupon(
    @Request() req: any,
    @Body()
    createCouponDto: CreateCouponDto,
  ) {
    return this.couponService.createCoupon(req.user.userId, createCouponDto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  @Get()
  @ApiOperation({ summary: 'Get coupons with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'experienceId',
    required: false,
    description: 'Filter by experience ID',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: CouponType,
    description: 'Filter by coupon type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CouponStatus,
    description: 'Filter by coupon status',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title/description/code',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getCoupons(
    @Query(new ZodValidationPipe(CouponQuerySchema)) query: CouponQueryDto,
  ) {
    try {
      const { page, limit, sortBy, sortOrder, ...filters } = query;
      const pagination: PaginationOptions = { page, limit, sortBy, sortOrder };

      const result = await this.couponService.getCoupons(filters, pagination);

      return {
        success: true,
        message: 'Coupons retrieved successfully',
        ...result,
      };
    } catch (error) {
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  @Get('my-coupons')
  @ApiOperation({ summary: "Get current user's coupons" })
  @ApiResponse({
    status: 200,
    description: 'User coupons retrieved successfully',
  })
  @ApiQuery({
    name: 'includeExpired',
    required: false,
    description: 'Include expired coupons',
  })
  async getMyCoupons(
    @Request() req: any,
    @Query('includeExpired') includeExpired?: string,
  ) {
    try {
      const userId = req.user.userId;
      const includeExp = includeExpired === 'true';

      const coupons = await this.couponService.getUserCoupons(
        userId,
        includeExp,
      );

      return {
        success: true,
        message: 'User coupons retrieved successfully',
        data: coupons,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('experience/:experienceId')
  @ApiOperation({
    summary: 'Get coupons for a specific experience (host only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Experience coupons retrieved successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not experience owner' })
  @ApiParam({ name: 'experienceId', description: 'Experience ID' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  async getExperienceCoupons(
    @Request() req: any,
    @Param('experienceId') experienceId: string,
  ) {
    try {
      const hostId = req.user.userId;
      const coupons = await this.couponService.getExperienceCoupons(
        experienceId,
        hostId,
      );

      return {
        success: true,
        message: 'Experience coupons retrieved successfully',
        data: coupons,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  async getCouponById(@Request() req: any, @Param('id') id: string) {
    try {
      const userId = req.user?.userId;
      const coupon = await this.couponService.getCouponById(id, userId);

      return {
        success: true,
        message: 'Coupon retrieved successfully',
        data: coupon,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get coupon by code' })
  @ApiResponse({ status: 200, description: 'Coupon retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'code', description: 'Coupon code' })
  async getCouponByCode(@Param('code') code: string) {
    try {
      const coupon = await this.couponService.getCouponByCode(code);

      return {
        success: true,
        message: 'Coupon retrieved successfully',
        data: coupon,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiResponse({ status: 200, description: 'Coupon updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or coupon already used',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - not coupon owner' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.update')
  async updateCoupon(
    @Request() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCouponSchema))
    updateCouponDto: UpdateCouponDto,
  ) {
    try {
      const userId = req.user.userId;
      const coupon = await this.couponService.updateCoupon(
        id,
        userId,
        updateCouponDto,
      );

      return {
        success: true,
        message: 'Coupon updated successfully',
        data: coupon,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete (cancel) coupon' })
  @ApiResponse({ status: 200, description: 'Coupon cancelled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not coupon owner' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.delete')
  async deleteCoupon(@Request() req: any, @Param('id') id: string) {
    try {
      const userId = req.user.userId;
      const coupon = await this.couponService.deleteCoupon(id, userId);

      return {
        success: true,
        message: 'Coupon cancelled successfully',
        data: coupon,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= COUPON REDEMPTION =============

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem a coupon' })
  @ApiResponse({ status: 200, description: 'Coupon redeemed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid coupon or redemption data',
  })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.redeem')
  @UsePipes(new ZodValidationPipe(RedeemCouponSchema))
  async redeemCoupon(
    @Request() req: any,
    @Body()
    redeemCouponDto: RedeemCouponDto,
  ) {
    try {
      // Add IP address from request if not provided
      if (!redeemCouponDto.ipAddress) {
        redeemCouponDto.ipAddress = req.ip || req.connection.remoteAddress;
      }

      const redemption = await this.couponService.redeemCoupon(redeemCouponDto);

      return {
        success: true,
        message: 'Coupon redeemed successfully',
        data: redemption,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= ANALYTICS & REPORTING =============

  @Get('analytics/overview')
  @ApiOperation({ summary: 'Get coupon analytics overview' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'experienceId',
    required: false,
    description: 'Filter by experience ID',
  })
  @ApiQuery({
    name: 'validFrom',
    required: false,
    description: 'Filter by valid from date',
  })
  @ApiQuery({
    name: 'validTo',
    required: false,
    description: 'Filter by valid to date',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  async getCouponAnalytics(
    @Query(new ZodValidationPipe(CouponQuerySchema.partial()))
    query: Partial<CouponQueryDto>,
  ) {
    try {
      const { userId, experienceId, validFrom, validTo } = query;
      const filters: CouponFilters = {
        userId,
        experienceId,
        validFrom,
        validTo,
      };

      const analytics = await this.couponService.getCouponAnalytics(filters);

      return {
        success: true,
        message: 'Analytics retrieved successfully',
        data: analytics,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= ADMIN OPERATIONS =============

  //get all coupons
  @Get('/admin/all')
  @ApiOperation({ summary: 'Get all coupons (Admin only)' })
  @ApiResponse({ status: 200, description: 'Coupons retrieved successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  async getAllCoupons(@Query() query: any) {
    try {
      const result = await this.couponService.getAllCoupons(query);

      return {
        success: true,
        message: 'Coupons retrieved successfully',
        ...result,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('/admin/expire-old')
  @ApiOperation({ summary: 'Expire old coupons (Admin only)' })
  @ApiResponse({ status: 200, description: 'Old coupons expired successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @HttpCode(HttpStatus.OK)
  async expireOldCoupons() {
    try {
      const result = await this.couponService.expireOldCoupons();

      return {
        success: true,
        message: `${result.expiredCount} coupons expired successfully`,
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  // ============= VALIDATION ENDPOINTS =============

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate coupon code without redeeming' })
  @ApiResponse({ status: 200, description: 'Coupon validation result' })
  @ApiResponse({ status: 404, description: 'Coupon not found' })
  @ApiParam({ name: 'code', description: 'Coupon code to validate' })
  @ApiQuery({
    name: 'experienceId',
    required: false,
    description: 'Experience ID for validation',
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('coupon.read')
  async validateCoupon(
    @Param('code') code: string,
    @Query('experienceId') experienceId?: string,
  ) {
    try {
      const coupon = await this.couponService.getCouponByCode(code);

      let validationResult = {
        valid: true,
        coupon: {
          id: coupon.id,
          title: coupon.title,
          description: coupon.description,
          value: coupon.value,
          currency: coupon.currency,
          type: coupon.type,
          validFrom: coupon.validFrom,
          validTo: coupon.validTo,
          usedCount: coupon.usedCount,
          maxUses: coupon.maxUses,
          status: coupon.status,
        },
        errors: [] as string[],
      };

      // Perform validation checks
      try {
        if (experienceId) {
          await this.couponService.validateCouponForRedemption(
            coupon,
            experienceId,
          );
        } else {
          // Basic validation without experience check
          if (!coupon.isActive)
            validationResult.errors.push('Coupon is not active');
          if (coupon.status !== CouponStatus.ACTIVE)
            validationResult.errors.push(`Coupon status: ${coupon.status}`);
          if (new Date() < coupon.validFrom)
            validationResult.errors.push('Coupon is not yet valid');
          if (new Date() > coupon.validTo)
            validationResult.errors.push('Coupon has expired');
          if (coupon.usedCount >= coupon.maxUses)
            validationResult.errors.push('Coupon usage limit exceeded');
        }
      } catch (error) {
        validationResult.valid = false;
        validationResult.errors.push(error.message);
      }

      if (validationResult.errors.length > 0) {
        validationResult.valid = false;
      }

      return {
        success: true,
        message: validationResult.valid
          ? 'Coupon is valid'
          : 'Coupon validation failed',
        data: validationResult,
      };
    } catch (error) {
      throw error;
    }
  }
}
