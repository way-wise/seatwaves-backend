import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

@Injectable()
export class UploadService {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow('AWS_REGION'),
      endpoint: this.configService.getOrThrow('AWS_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  // ========= Upload file to S3 =========
  private async s3_upload(
    file: Buffer,
    bucket: string,
    name: string,
    mimetype: string,
  ) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: name,
      Body: file,
      ACL: 'public-read',
      ContentType: mimetype,
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000, immutable',
    });

    try {
      await this.s3Client.send(command);
      return {
        Location: `${this.configService.getOrThrow('AWS_ENDPOINT')}/${bucket}/${name}`,
        Key: name,
        Bucket: bucket,
      };
    } catch (e) {
      return e;
    }
  }

  // ========= Upload file entry point =========
  public async uploadFile(file: any, folderName: string) {
    file.originalname = file.originalname.trim().replace(/\s/g, '-');
    // content hash to version the object key for immutable caching
    const hash = createHash('sha1')
      .update(file.buffer)
      .digest('hex')
      .slice(0, 12);
    const newFileName = `${folderName}/${hash}-${Date.now()}-${file.originalname}`;

    if (this.configService.get('DISABLE_LOCAL_STORAGE') === 'true') {
      return this.s3_upload(
        file.buffer,
        this.configService.get('AWS_BUCKET_NAME') as string,
        newFileName,
        file.mimetype,
      );
    }

    const localStoragePath = path.join('storage', newFileName);
    fs.mkdirSync(path.dirname(localStoragePath), { recursive: true });
    fs.writeFileSync(localStoragePath, file.buffer);
    return { Key: localStoragePath };
  }

  // ========= Generate public signed URL =========
  public makeUrlPublic(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.configService.get('AWS_BUCKET_NAME'),
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  // ========= View image from local =========
  public localView(key: string, res: any) {
    const filePath = path.join(__dirname, '../../', key);
    if (fs.existsSync(filePath)) {
      // mirror CDN caching headers for local files
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(filePath);
    }
    return res.json({ data: 'file not found' });
  }

  // ========= Delete file =========
  public async deleteFile(key: string) {
    if (this.configService.get('DISABLE_LOCAL_STORAGE') === 'true') {
      const command = new DeleteObjectCommand({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: key,
      });

      try {
        return await this.s3Client.send(command);
      } catch (e) {
        return e;
      }
    } else {
      const filePath = path.join(__dirname, '../../', key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
