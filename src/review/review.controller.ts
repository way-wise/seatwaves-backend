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
import { ReviewQueryByHost, reviewQueryByHostSchema } from './dto/query.dto';
import { createReviewDto, createReviewSchema } from './dto/review.dto';
import {
  CreateReviewReplyDto,
  createReviewReplyScheam,
} from './dto/reviewReply.dto';
import { ReviewService } from './review.service';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.create')
  @UsePipes(new ZodValidationPipe(createReviewSchema))
  @Post()
  create(@Body() body: createReviewDto, @Req() req) {
    return this.reviewService.create(body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.update')
  @Put('/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.reviewService.updateStatus(id, body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.update')
  @Post(`/reply`)
  @UsePipes(new ZodValidationPipe(createReviewReplyScheam))
  reply(@Body() body: CreateReviewReplyDto, @Req() req) {
    return this.reviewService.reply(body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.read')
  @Get('/admin/all')
  @UsePipes(new ZodQueryValidationPipe(reviewQueryByHostSchema))
  findAll(@Query() query: any) {
    return this.reviewService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.read')
  @Get('/pending')
  @UsePipes(new ZodQueryValidationPipe(reviewQueryByHostSchema))
  findAllPending(@Req() req, @Query() query: ReviewQueryByHost) {
    return this.reviewService.findAllPending(req.user.userId, query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @Permissions('review.read', 'seller.reviews.view')
  @Get('/seller')
  @UsePipes(new ZodQueryValidationPipe(reviewQueryByHostSchema))
  findAllByHost(@Req() req, @Query() query: ReviewQueryByHost) {
    return this.reviewService.findAllByHost(req.user.userId, query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.read')
  @Get('/event/:id')
  findAllByExperience(@Param('id') id: string, @Query() query: any) {
    return this.reviewService.findAllByExperience(id, query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('review.read')
  @Get('/events/:id')
  @UsePipes(new ZodQueryValidationPipe(reviewQueryByHostSchema))
  findAllByEvent(@Param('id') id: string, @Query() query: ReviewQueryByHost) {
    return this.reviewService.findAllByEvent(id, query);
  }

  //Public Get Total review by experience
  @Get('/experience/:id/stats')
  getAllReviewsByExperience(@Param('id') id: string) {
    return this.reviewService.getReviwStats(id);
  }
}
