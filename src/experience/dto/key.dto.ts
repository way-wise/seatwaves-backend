import { z } from 'zod';

export const CheckKeySchema = z.object({
  key: z.enum(
    ['information', 'location', 'schedule', 'policy', 'details', 'preference'],
    {
      required_error: 'key is required',
    },
  ),
});
