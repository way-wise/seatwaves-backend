import { z } from 'zod';
import { Currency, PaymentProvider, TransactionStatus, TransactionType } from '@prisma/client';

export const adminTransactionQuerySchema = z.object({
  // pagination & sort
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
  sort: z.enum(['createdAt', 'amount', 'processedAt']).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),

  // general search (supports key=value or broad)
  search: z.string().optional(),

  // filters
  type: z.nativeEnum(TransactionType).optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  currency: z.nativeEnum(Currency).optional(),
  provider: z.nativeEnum(PaymentProvider).optional(),

  payerId: z.string().optional(),
  payeeId: z.string().optional(),
  bookingId: z.string().optional(),
  couponId: z.string().optional(),
  experienceId: z.string().optional(),
  parentTransactionId: z.string().optional(),

  externalTxnId: z.string().optional(),
  stripePaymentIntent: z.string().optional(),
  stripeTransferId: z.string().optional(),
  stripeAccountId: z.string().optional(),
  stripeChargeId: z.string().optional(),

  // date range
  from: z.string().optional(), // YYYY-MM-DD
  to: z.string().optional(),   // YYYY-MM-DD
});

export type AdminTransactionQuery = z.infer<typeof adminTransactionQuerySchema>;
