import { ApiConsumes } from '@nestjs/swagger';



@ApiConsumes('multipart/form-data')
export class UploadFileDto {
  file: Express.Multer.File;
}
