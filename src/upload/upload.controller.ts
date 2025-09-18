import {
  Controller,
  Get,
  Query,
  Res,
  Delete,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
@Controller('media')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async makeUrlPublic(@Query('key') key: string, @Res() res: Response) {
    if (this.configService.get('DISABLE_LOCAL_STORAGE') === 'true') {
      const url = await this.uploadService.makeUrlPublic(key);
      return res.json(url);
    }
    return await this.uploadService.localView(key, res);
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Delete a file from the local storage' })
  @ApiQuery({ name: 'key', type: String, required: true })
  async deleteFile(@Query('key') key: string) {
    return await this.uploadService.deleteFile(key);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadFile(file, 'editor');
    // If S3 is used, Location will be present and publicly accessible
    if ((result as any).Location) {
      return { url: (result as any).Location, key: (result as any).Key };
    }
    // Local storage returns a Key; build a URL that proxies the file
    // The client can also construct this with its API base URL
    const key = (result as any).Key;
    return { url: `/media?key=${encodeURIComponent(key)}`, key };
  }
}
