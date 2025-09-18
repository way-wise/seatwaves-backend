import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/createBlog.dto';
import { UpdateBlogDto } from './dto/updateBlog.dto';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@Controller('blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.create')
  @Post()
  @UseInterceptors(FileInterceptor('coverImage'))
  async create(
    @Body() body: CreateBlogDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    coverImage?: Express.Multer.File,
    @Req() req?,
  ) {
    // Set authorId from authenticated user to satisfy schema and DB relation
    if (req?.user?.userId) {
      (body as any).authorId = req.user.userId;
    }
    return this.blogService.createBlog(body, coverImage);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.update')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('coverImage'))
  async update(
    @Param('id') id: string,
    @Body() body: UpdateBlogDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    coverImage?: Express.Multer.File,
  ) {
    return this.blogService.updateBlog(id, body, coverImage);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.read')
  @Get('/edit/:id')
  async edit(@Param('id') id: string) {
    return this.blogService.getBlogById(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.delete')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.blogService.deleteBlog(id);
  }

  @Get()
  async getAll(
    @Query('status') status?: 'DRAFT' | 'PUBLISHED',
    @Query('isFeatured') isFeatured?: string,
    @Query('search') search?: string,
  ) {
    return this.blogService.getAllBlogs({
      status,
      isFeatured: isFeatured === 'true',
      search,
    });
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.read')
  @Get('/admin')
  async getAllAdmin(@Query() query: any) {
    return this.blogService.getAllAdminBlogs(query);
  }

  @Get('/public')
  async getPublicBlogs(@Query() query: any) {
    return this.blogService.getPublicBlogs(query);
  }

  @Get('/:idOrSlug')
  async getOne(@Param('idOrSlug') idOrSlug: string) {
    return this.blogService.getBlogByIdOrSlug(idOrSlug);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.update')
  @Patch(':id/feature')
  async feature(@Param('id') id: string, @Query('value') value: string) {
    return this.blogService.toggleFeature(id, value === 'true');
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.update')
  @Patch(':id/publish')
  async publish(@Param('id') id: string) {
    return this.blogService.publishBlog(id);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @Permissions('blog.update')
  @Patch(':id/unpublish')
  async unpublish(@Param('id') id: string) {
    return this.blogService.unpublishBlog(id);
  }
}
