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
} from '@nestjs/common';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { EventService } from './event.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('events')
// @UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  getEvents(@Query() query) {
    return this.eventService.getAllEventsPublic(query);
  }

  //get Signle Event
  @Get('/:id')
  getEvent(@Param('id') id: string) {
    return this.eventService.getEvent(id);
  }

  //get events by id
  @Get(':id/seats')
  getSeatsByEventId(@Param('id') id: string, @Query() query) {
    return this.eventService.getSeatsByEventId(id, query);
  }

  @Get('/admin')
  // @Permissions('read:event')
  getEventsAdmin(@Query() query) {
    return this.eventService.getAllEventsAdmin(query);
  }

  @Get('/seller/:id')
  getEventsBySeller(@Param('id') id: string, @Query() query) {
    return this.eventService.getEventsBySeller(id, query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  // @Permissions('create:event')
  createEvent(@Body() body, @Req() req) {
    return this.eventService.createEvent(body, req.user.userId);
  }

  //event bulk create
  @Post('/bulk')
  // @Permissions('create:event')
  createEventsBulk(@Body() body) {
    return this.eventService.createEventsBulk(body);
  }
  //add seats to event\
  @UseGuards(AuthGuard('jwt'))
  @Post('/:id/seats')
  addSeats(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.eventService.addSeatToEvent(id, body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/seats/:id')
  @Permissions('update:event')
  updateSeat(@Param('id') id: string, @Body() body: any) {
    return this.eventService.updateSeat(id, body);
  }
}
