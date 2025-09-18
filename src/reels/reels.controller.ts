// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Put,
//   Query,
//   Request,
//   UseGuards,
//   UsePipes,
// } from '@nestjs/common';
// import { ReelsService } from './reels.service';
// import { createReelsSchema, CreateReelsDto } from './dto/create.dto';
// import { updateReelsSchema, UpdateReelsDto } from './dto/update.dto';
// import { queryReelsSchema, QueryReelsDto } from './dto/query.dto';
// import { ZodValidationPipe } from 'src/common/zodValidationPipe';
// import { AuthGuard } from '@nestjs/passport';
// import { PermissionsGuard } from 'src/common/guards/permissions.guard';
// import { Permissions } from 'src/common/decorators/permissions.decorator';

// @Controller('reels')
// @UseGuards(AuthGuard('jwt'), PermissionsGuard)
// export class ReelsController {
//   constructor(private readonly reelsService: ReelsService) {}

//   @Permissions('reel.create')
//   @Post()
//   @UseGuards(AuthGuard('jwt'))
//   @UsePipes(new ZodValidationPipe(createReelsSchema))
//   async create(@Body() dto: CreateReelsDto, @Request() req: any) {
//     return this.reelsService.create(dto, req.user.userId);
//   }

//   @Permissions('reel.read')
//   @Get()
//   @UsePipes(new ZodValidationPipe(queryReelsSchema))
//   async findAll(@Query() query: QueryReelsDto) {
//     return this.reelsService.findAll(query);
//   }

//   @Permissions('reel.read')
//   @Get(':id')
//   async findOne(@Param('id') id: string) {
//     return this.reelsService.findOne(id);
//   }

//   @Permissions('reel.update')
//   @Patch(':id')
//   @UsePipes(new ZodValidationPipe(updateReelsSchema))
//   async update(@Param('id') id: string, @Body() dto: UpdateReelsDto) {
//     return this.reelsService.update(id, dto);
//   }

//   @Permissions('reel.delete')
//   @Delete(':id')
//   async remove(@Param('id') id: string) {
//     return this.reelsService.remove(id);
//   }

//   @Permissions('reel.delete')
//   @Delete(':id/hard')
//   async hardDelete(@Param('id') id: string) {
//     return this.reelsService.hardDelete(id);
//   }

//   @Permissions('reel.delete')
//   @Put(':id/restore')
//   async restore(@Param('id') id: string) {
//     return this.reelsService.restore(id);
//   }
// }
