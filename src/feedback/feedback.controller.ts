import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, createFeedbackSchema } from './dto/create.dto';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createFeedbackSchema))
  async createFeedback(@Body() feedbackDto: CreateFeedbackDto) {
    return this.feedbackService.createFeedback(feedbackDto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('feedback.read')
  @Get()
  async getAllFeedback(@Query() query: any) {
    return this.feedbackService.getAllFeedback(query);
  }
}
