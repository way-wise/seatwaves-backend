import { z } from 'zod';

export const ticketSchema = z.object({
  ticketId: z.string().min(1),
  ticketType: z.string().optional(),
  seatDetails: z.string(),
  metadata: z.record(z.any()).optional(),
  price: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  discountType: z.enum(['FIXED', 'PERCENTAGE']).optional().default('FIXED'),
  thumbnail: z.string().optional(),
});

export const createEventScehema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500).optional(),
  eventId: z.string().min(1),
  venue: z.string().min(3).max(100),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional(),
  duration: z.number().optional().default(0), // duration in minutes
  categoryId: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  seatmapImage: z.string().optional(),
  venuImage: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  tickets: z.array(ticketSchema).optional().default([]),
  originUrl: z.string(),
});
