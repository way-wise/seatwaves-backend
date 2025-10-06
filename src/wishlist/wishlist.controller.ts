// src/wishlist/wishlist.controller.ts
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WishlistService } from './wishlist.service';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@UseGuards(AuthGuard('jwt'))
@Controller('wishlists')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post(':eventId')
  @UseGuards(AuthGuard('jwt'))
  async create(@Param('eventId') eventId: string, @Req() req) {
    return this.wishlistService.addItem(eventId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Permissions('user.wishlist.view')
  @Get()
  async findAll(@Query() query: any, @Req() req) {
    return this.wishlistService.findAll(req.user.userId, query);
  }

  @Get('/app')
  async findAllApp(@Query() query: any, @Req() req) {
    return this.wishlistService.findAllApp(req.user.userId, query);
  }

  @Delete('/clear')
  async clear(@Req() req) {
    return this.wishlistService.clear(req.user.userId);
  }

  @Delete(':experienceId')
  @UseGuards(AuthGuard('jwt'))
  async removeItem(@Req() req, @Param('experienceId') experienceId: string) {
    return this.wishlistService.removeItem(req.user.userId, experienceId);
  }
}
