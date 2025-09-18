import { z } from 'zod';

export const preferenceSchema = z.object({
  amenityIds: z.array(z.string()).min(1, 'At least one amenity is required'),
  agreement: z.string({ required_error: 'Agreement is required' }).url(),
});
