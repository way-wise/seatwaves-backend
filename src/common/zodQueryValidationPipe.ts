// src/common/pipes/zod-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodQueryValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    // Only apply to query or body parameters, not other types like params
    if (metadata.type === 'query' || metadata.type === 'body') {
      const result = this.schema.safeParse(value);
      if (!result.success) {
        throw new BadRequestException(result.error.errors);
      }
      return result.data;
    }
    return value; // Return original value for other metadata types
  }
}
