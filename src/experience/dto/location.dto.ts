import { z } from 'zod';

export const locationSchemas = z.object({
  country: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type Location = z.infer<typeof locationSchemas>;
