import { z } from 'zod';

export const notificationsSettingsSchema = z.object({
  newBooking: z.boolean().default(true),
  bookingcancellation: z.boolean().default(true),
  bookingreminder: z.boolean().default(true),
  payoutintiated: z.boolean().default(true),
  payoutcompleted: z.boolean().default(true),
  newreview: z.boolean().default(true),
  eventupdate: z.boolean().default(true),
  promotionaloffer: z.boolean().default(true),
  loginnewdevice: z.boolean().default(true),
  policychange: z.boolean().default(true),
  securityalert: z.boolean().default(true),
});
export type NotificationsSettingsDto = z.infer<
  typeof notificationsSettingsSchema
>;
