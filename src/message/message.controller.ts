// src/message/message.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ZodValidationPipe } from '../common/zodValidationPipe';
import { initMessageSchema } from './dto/initMessage.dto';
import { CreateMessageDto } from './dto/message.dto';
import { PaginationQueryDto } from './dto/pagination.dto';
import { MessageService } from './message.service';

@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Permissions('message.initiate')
  @Post('initiate')
  initiateMessage(
    @Body(new ZodValidationPipe(initMessageSchema)) body: any,
    @Req() req,
  ) {
    return this.messageService.initiateMessage(body, req.user.userId);
  }

  @Permissions('message.send')
  @Post('send/:id')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileFieldsInterceptor([{ name: 'files', maxCount: 5 }]))
  sendMessage(
    @UploadedFiles() files: { files?: Express.Multer.File[] },
    @Body() body: CreateMessageDto,
    @Req() req,
    @Param('id') id: string,
  ) {
    return this.messageService.sendMessage(
      body,
      req.user.userId,
      id,
      files?.files || [],
    );
  }

  @Permissions('message.read')
  @Get('/sidebar')
  getSidebar(@Req() req, @Query() query: any) {
    return this.messageService.getSidebar(req.user.userId, query);
  }

  @Patch(':id/reads')
  markAsRead(@Param('id') id: string, @Req() req) {
    return this.messageService.markAsRead(id, req.user.userId);
  }

  @Permissions('message.read')
  @Get(':roomId')
  getMessages(@Param('roomId') id: string, @Query() query: PaginationQueryDto) {
    return this.messageService.getSingleRoom(id, query);
  }

  @Permissions('message.delete')
  @Delete('remove/:id')
  removeMessage(@Param('id') id: string, @Req() req) {
    return this.messageService.removeMessage(id, req.user.userId);
  }

  @Permissions('message.delete.room')
  @Delete(':id')
  deleteRoom(@Param('id') id: string) {
    return this.messageService.deleteRoom(id);
  }
}
