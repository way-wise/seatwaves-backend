import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';

import { AuthGuard } from '@nestjs/passport';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { createBookingDto, createBookingSchema } from './dto/booking.dto';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { BookingStatus } from '@prisma/client';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ✅ User - Create booking
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.create')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createBookingSchema)) body: createBookingDto,
    @Req() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return await this.bookingService.create(body, req.user.userId);
  }

  // User - Upcoming Booking
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get('/upcoming')
  async upcomingBooking(@Req() req) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return await this.bookingService.upcomingBooking(req.user.userId);
  }

  // ✅ User - Get own bookings
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get('my')
  async findGuest(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return await this.bookingService.findByGuest(req.user.userId, query);
  }

  // Invoice
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.invoice')
  @Get(':id/invoice')
  async invoice(@Param('id') id: string, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return await this.bookingService.invoice(id, req.user.userId);
  }

  //callback url
  @Get('/success')
  async success(@Query() query: any) {
    return this.bookingService.success(query);
  }

  // ✅ Guest - Get booking by id
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return await this.bookingService.findOneForGuest(id, req.user.userId);
  }

  // ✅ Guest - Cancel booking
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.cancel')
  @Patch(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    return await this.bookingService.cancelByGuest(id, req.user.userId);
  }

  // ✅ Seller - Get bookings
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get()
  async findAll(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return await this.bookingService.findByHost(req.user.userId, query);
  }

  //update seller status of booking
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.update')
  @Patch(':orderId/order-status')
  async updateSellerStatus(
    @Param('orderId') orderId: string,
    @Body() body: { status: BookingStatus },
    @Req() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.bookingService.updateSellerStatus(
      orderId,
      body.status,
      req.user.userId,
    );
  }

  // ✅ Seller - Get bookings for app
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get('/seller/app')
  async findHostBookings(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.bookingService.findHostAppBookings(req.user.userId, query);
  }

  //Admin Get All Bookings
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get('/admin/all')
  async adminGetAllBookings(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.bookingService.adminGetAllBookings(query);
  }

  // Admin - Get Booking Details
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Get('/admin/:bookingId/details')
  async adminGetBookingDetails(
    @Param('bookingId') bookingId: string,
    @Req() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.bookingService.adminGetBookingDetails(bookingId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Post('/generate/code/:bookingId')
  async generateBookingCode(@Param('bookingId') bookingId: string, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.bookingService.generateBookingCode(bookingId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('booking.read')
  @Post('/verify/:bookingId')
  async verifyBookingCode(
    @Param('bookingId') bookingId: string,
    @Body() body: { otp: string },
    @Req() req,
  ) {
    if (!req.user) {
      throw new UnauthorizedException('User not found');
    }
    return this.bookingService.verifyBookingCode(bookingId, body.otp);
  }
}
