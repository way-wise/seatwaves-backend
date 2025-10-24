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
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { EventService } from './event.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('events')
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('seller.events.view')
  @Get('/seller/listing')
  getSellerListing(@Query() query: any, @Req() req) {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return this.eventService.getSellerListing(query, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('admin.event.view')
  @Get('/admin/all')
  getEventsAdmin(@Query() query) {
    return this.eventService.getAllEventsAdmin(query);
  }

  //seller events
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('seller.events.view')
  @Get('/seller/all')
  getEventsSeller(@Query() query, @Req() req) {
    return this.eventService.getEventsSeller(query, req.user.userId);
  }

  //admin get single event
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('admin.event.view')
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

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.create')
  @Post()
  createEvent(@Body() body, @Req() req) {
    return this.eventService.createEvent(body, req.user.userId);
  }

  //event bulk create
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.create')
  @Post('/bulk')
  createEventsBulk(@Body() body) {
    return this.eventService.createEventsBulk(body);
  }
  //add ticket to event
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.update')
  @Post('/:id/tickets')
  addTicket(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.eventService.addticketToEvent(id, body, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.update')
  @Put('/tickets/:id')
  updateTicket(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.eventService.updateticket(id, body, req.user.userId);
  }

  //delete ticket
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.delete')
  @Delete('/tickets/:id')
  deleteTicket(@Param('id') id: string, @Req() req) {
    return this.eventService.deleteTicket(id, req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.create')
  @Post('/collections')
  createCollection(@Body() body: any) {
    return this.eventService.createCollections(body);
  }

  @Get('/collections/list')
  getCollections(@Query() query) {
    return this.eventService.getCollections(query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('admin.event.view')
  @Get('/collections/admin')
  getAdminCollections(@Query() query: any) {
    return this.eventService.getAdminCollections(query);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('event.delete')
  @Delete('/collections/:id')
  deleteCollection(@Param('id') id: string) {
    return this.eventService.deleteCollection(id);
  }
}
