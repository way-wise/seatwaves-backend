import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Put,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { HelpService } from './help.service';
import { CreateHelpDto, createHelpSchema } from './dto/create.dto';
import { UpdateHelpDto, updateHelpSchema } from './dto/update.dto';
import { HelpQueryDto } from './dto/query.dto';
import { ZodValidationPipe } from 'src/common/zodValidationPipe';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('help')
export class HelpController {
  constructor(private readonly helpService: HelpService) {}

  @Get()
  async findAll(@Query() query: HelpQueryDto) {
    return this.helpService.findAll(query);
  }

  @Get('/stats')
  async getStats() {
    return this.helpService.getStats();
  }

  //get admin help faq
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.read')
  @Get('/admin')
  async findAllAdmin(@Query() query: HelpQueryDto) {
    return this.helpService.findAllAdmin(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.helpService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.create')
  @UsePipes(new ZodValidationPipe(createHelpSchema))
  async create(@Body() createHelpDto: CreateHelpDto) {
    return this.helpService.create(createHelpDto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.update')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateHelpDto: UpdateHelpDto) {
    return this.helpService.update(id, updateHelpDto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.delete')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.helpService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.delete')
  @Delete(':id/hard')
  async hardDelete(@Param('id') id: string) {
    return this.helpService.hardDelete(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.delete')
  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    return this.helpService.restore(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('help.update')
  @Patch('bulk/status')
  async bulkUpdateStatus(
    @Body('ids') ids: string[],
    @Body('status') status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED',
  ) {
    return this.helpService.bulkUpdateStatus(ids, status);
  }
}
