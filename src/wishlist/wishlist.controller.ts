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

@Controller('wishlists')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('wishlist.create')
  @Post(':eventId')
  async create(@Param('eventId') eventId: string, @Req() req) {
    return this.wishlistService.addItem(eventId, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('wishlist.read')
  @Get()
  async findAll(@Query() query: any, @Req() req) {
    return this.wishlistService.findAll(req.user.userId, query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('wishlist.read')
  @Get('/app')
  async findAllApp(@Query() query: any, @Req() req) {
    return this.wishlistService.findAllApp(req.user.userId, query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('wishlist.delete')
  @Delete('/clear')
  async clear(@Req() req) {
    return this.wishlistService.clear(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('wishlist.delete')
  @Delete(':experienceId')
  async removeItem(@Req() req, @Param('experienceId') experienceId: string) {
    return this.wishlistService.removeItem(req.user.userId, experienceId);
  }
}
