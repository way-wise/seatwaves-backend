import { User } from 'src/auth/types/user-payload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        status: string;
      };
    }
  }
}

import { Multer } from 'express'; // Import Multer from the @types/express package

@ApiConsumes('multipart/form-data')
export class UploadFileDto {
  file: Multer.File; // Use the imported Multer type
}
