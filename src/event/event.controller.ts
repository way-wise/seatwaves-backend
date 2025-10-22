import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
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

  //events listing for events page
  @Get('/listing/all')
  getEventsListing(@Query() query) {
    return this.eventService.getEventsListing(query);
  }

  //get Signle Event
  @Get('/:id')
  getEvent(@Param('id') id: string) {
    return this.eventService.getEvent(id);
  }

  //get seller listing
  @UseGuards(AuthGuard('jwt'))
  @Get('/seller/listing')
  getSellerListing(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.eventService.getSellerListing(query, req.user.userId);
  }

  @Get('/admin/all')
  // @Permissions('read:event')
  getEventsAdmin(@Query() query) {
    return this.eventService.getAllEventsAdmin(query);
  }

  //seller events
  @UseGuards(AuthGuard('jwt'))
  @Get('/seller/all')
  getEventsSeller(@Query() query, @Req() req) {
    return this.eventService.getEventsSeller(query, req.user.userId);
  }

  //admin get single event
  @Permissions('event.read')
  @Get('/admin/events/:id')
  async adminGetSingleEventById(@Param('id') id: string, @Query() query: any) {
    return this.eventService.adminGetSingleEventById(id, query);
  }

  //get events by id
  @Get(':eventId/tickets')
  getSeatsByEventId(@Param('eventId') eventId: string, @Query() query: any) {
    return this.eventService.getticketsByEventId(eventId, query);
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
  //add ticket to event\
  @UseGuards(AuthGuard('jwt'))
  @Post('/:id/tickets')
  addTicket(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.eventService.addticketToEvent(id, body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Put('/tickets/:id')
  @Permissions('update:event')
  updateTicket(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.eventService.updateticket(id, body, req.user.userId);
  }

  //delete ticket
  @UseGuards(AuthGuard('jwt'))
  @Delete('/tickets/:id')
  @Permissions('delete:event')
  deleteTicket(@Param('id') id: string, @Req() req) {
    return this.eventService.deleteTicket(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/collections')
  @Permissions('create:event')
  createCollection(@Body() body: any) {
    return this.eventService.createCollections(body);
  }

  @Get('/collections/list')
  getCollections(@Query() query) {
    return this.eventService.getCollections(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/collections/admin')
  @Permissions('read:event')
  getAdminCollections(@Query() query: any) {
    return this.eventService.getAdminCollections(query);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('/collections/:id')
  @Permissions('delete:event')
  deleteCollection(@Param('id') id: string) {
    return this.eventService.deleteCollection(id);
  }
}
