import { z } from 'zod';

export const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  maxGuest: z.number().int().min(1).optional(),
  maxperSlot: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  activites: z.any().optional(),
  maxparticipants: z.number().int().min(1).optional(),
  duration: z.number().optional(),
  // pricing
  price: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
});

export type UpdateEventDto = z.infer<typeof updateEventSchema>;
