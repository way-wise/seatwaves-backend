import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { EventService } from './event.service';

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

  @Post()
  // @Permissions('create:event')
  createEvent(@Body() body) {
    return this.eventService.createEvent(body);
  }

  //event bulk create
  @Post('/bulk')
  // @Permissions('create:event')
  createEventsBulk(@Body() body) {
    return this.eventService.createEventsBulk(body);
  }
  //add seats to event
  @Post('/:id/seats')
  @Permissions('update:event')
  addSeats(@Param('id') id: string, @Body() body: any) {
    return this.eventService.addSeatToEvent(id, body);
  }

  @Put('/seats/:id')
  @Permissions('update:event')
  updateSeat(@Param('id') id: string, @Body() body: any) {
    return this.eventService.updateSeat(id, body);
  }
}
