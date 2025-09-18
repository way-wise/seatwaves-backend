import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // @Get('health')
  // @ApiOperation({ summary: 'Get tasks service health status' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Health status retrieved successfully',
  // })
  // async getHealth() {
  //   const queueStats = await this.tasksService.getQueueStats();
  //   return {
  //     status: 'healthy',
  //     timestamp: new Date().toISOString(),
  //     queueStats,
  //   };
  // }

  // @Get('queue/stats')
  // @ApiOperation({ summary: 'Get queue statistics' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Queue statistics retrieved successfully',
  // })
  // async getQueueStats() {
  //   return this.tasksService.getQueueStats();
  // }

  // @Post('recurring/run-once')
  // @ApiOperation({ summary: 'Manually trigger recurring event processing once' })
  // @ApiResponse({ status: 200, description: 'Manual run completed or rejected' })
  // async runRecurringOnce() {
  //   return this.tasksService.runRecurringOnce();
  // }

  // @Post('test-queue')
  // @ApiOperation({ summary: 'Test queue connection by adding a simple job' })
  // @ApiResponse({ status: 200, description: 'Test job queued' })
  // async testQueue() {
  //   return this.tasksService.testQueueConnection();
  // }

  // @Post('recurring-events/trigger')
  // @ApiOperation({
  //   summary: 'Manually trigger recurring event generation for all experiences',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Recurring event generation triggered successfully',
  // })
  // async triggerRecurringEvents() {
  //   const result = await this.tasksService.triggerRecurringEventGeneration();
  //   return {
  //     success: true,
  //     metrics: result,
  //     triggeredAt: new Date().toISOString(),
  //   };
  // }

  // @Post('recurring-events/trigger/:experienceId')
  // @ApiOperation({
  //   summary:
  //     'Manually trigger recurring event generation for specific experience',
  // })
  // @ApiParam({
  //   name: 'experienceId',
  //   description: 'Experience ID to generate events for',
  // })
  // @ApiResponse({
  //   status: 200,
  //   description: 'Recurring event generation triggered successfully',
  // })
  // async triggerRecurringEventsForExperience(
  //   @Param('experienceId') experienceId: string,
  // ) {
  //   const result =
  //     await this.tasksService.triggerRecurringEventGeneration(experienceId);
  //   return {
  //     success: true,
  //     experienceId,
  //     metrics: result,
  //     triggeredAt: new Date().toISOString(),
  //   };
  // }
}
