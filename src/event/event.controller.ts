// import {
//   Body,
//   Controller,
//   Get,
//   Param,
//   Post,
//   Put,
//   Query,
//   UseGuards,
// } from '@nestjs/common';
// import { AuthGuard } from '@nestjs/passport';
// import { Permissions } from 'src/common/decorators/permissions.decorator';
// import { PermissionsGuard } from 'src/common/guards/permissions.guard';
// import { EventService } from './event.service';

// @Controller('events')
// @UseGuards(AuthGuard('jwt'), PermissionsGuard)
// export class EventController {
//   constructor(private readonly eventService: EventService) {}

//   //create single Event in experience
//   @Permissions('event.create')
//   @Post('create')
//   async createSingleEvent(@Body() body: any) {
//     return this.eventService.createSingleEvent(body);
//   }

//   //initiate event
//   @Permissions('event.update')
//   @Post(':id')
//   async createEvent(@Param('id') id: string) {
//     return this.eventService.initiateEvent(id);
//   }

//   //Get All Events by Experience
//   @Permissions('event.read')
//   @Get('all')
//   async getAllEvents() {
//     return this.eventService.getAllEvents();
//   }

//   //Get All Events by Experience
//   @Permissions('event.read')
//   @Get('/:id/all')
//   async getEventsByExperience(@Param('id') id: string, @Query() query: any) {
//     return this.eventService.getEventsByExperience(id, query);
//   }

//   //admin get all event with filter and search
//   @Permissions('event.read')
//   @Get('/admin/events/all')
//   async adminGetAllEvents(@Query() query: any) {
//     return this.eventService.adminGetAllEvents(query);
//   }

//   //admin get single event
//   @Permissions('event.read')
//   @Get('/admin/events/:id')
//   async adminGetSingleEventById(@Param('id') id: string, @Query() query: any) {
//     return this.eventService.adminGetSingleEventById(id, query);
//   }

//   // admin event participants flat list for DataTable
//   @Permissions('event.read')
//   @Get('/admin/events/:id/participants')
//   async adminGetEventParticipants(
//     @Param('id') id: string,
//     @Query() query: any,
//   ) {
//     return this.eventService.adminGetEventParticipants(id, query);
//   }

//   //Get All Events by Experience
//   @Permissions('event.read')
//   @Get('/admin/:id/all')
//   async getEventsByExperienceAdmin(
//     @Param('id') id: string,
//     @Query() query: any,
//   ) {
//     return this.eventService.getEventsByExperienceAdmin(id, query);
//   }

//   //Get Event by Id
//   @Permissions('event.read')
//   @Get('/:id')
//   async getEventById(@Param('id') id: string, @Query() query: any) {
//     return this.eventService.getEventById(id, query);
//   }

//   @Permissions('event.read')
//   @Get('/admin/:id')
//   async adminGetEventById(@Param('id') id: string, @Query() query: any) {
//     return this.eventService.adminGetEventById(id, query);
//   }
//   //update avaiable tickets
//   // @Permissions('event.update')
//   @Get('/update/avaiable/tickets')
//   async updateAvaiableTickets() {
//     return this.eventService.updateAvaiableTickets();
//   }
//   //Update Event
//   @Permissions('event.update')
//   @Put(':id')
//   async updateEvent(@Param('id') id: string, @Body() body: any) {
//     return this.eventService.updateEvent(id, body);
//   }
// }
