import { z } from 'zod';

export const priceandPolicySchema = z.object({
  // Prisma price: Decimal @default(0.0)
  price: z.number().min(0),
  // Prisma discountType: enum with default; allow optional update
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  // Prisma discount: Decimal @default(0.0)
  discount: z.number().min(0).optional(),
  // Prisma cancelPolicy: String? optional
  cancelPolicy: z.string().optional(),
  refundable: z.boolean().optional(),
  // Prisma cancellationFee: Decimal? optional, allow 0+
  cancellationFee: z.number().min(0).optional(),
  // Prisma maxGuest: Int? optional; allow 0 meaning unset from UI
  maxGuest: z.number().int().min(0).optional(),
  // Prisma guestRequirements: String? optional
  guestRequirements: z.string().optional(),
  // Prisma maxparticipants: Int? optional; allow 0
  maxparticipants: z.number().int().min(0).optional(),
  // Prisma maxPerSlot: Int? optional
  maxPerSlot: z.number().int().min(0).optional(),
});
