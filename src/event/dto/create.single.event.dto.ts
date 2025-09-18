import { DiscountType } from '@prisma/client';
import { z } from 'zod';

export const createSingleEventSchema = z.object({
  experienceId: z.string(),
  title: z.string(),
  date: z.coerce.date(),
  duration: z.number().optional(),
  endDate: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
  maxGuest: z.number(),
  maxperSlot: z.number().min(1),
  price: z.number(),
  discount: z.number().optional(),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.FIXED),
  maxparticipants: z.number(),
  notes: z.string().optional(),
  timeslots: z.any().optional(),
  activities: z.any().optional(),
});

export type CreateSingleEventDto = z.infer<typeof createSingleEventSchema>;
