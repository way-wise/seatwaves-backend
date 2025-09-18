import { MessageType } from '@prisma/client';
import { z } from 'zod';

export const createMessageSchema = z.object({
  message: z.string().min(1).optional(),
  type: z.nativeEnum(MessageType).default(MessageType.TEXT),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
