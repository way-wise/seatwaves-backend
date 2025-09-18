import { TransactionStatus } from '@prisma/client';
import { z } from 'zod';

export const transactionQuerySchema = z.object({
  search: z.string().optional(),
  limit: z.string().optional(),
  page: z.string().optional(),
  status: z.nativeEnum(TransactionStatus).optional(),
  sortBy: z.enum(['createdAt', 'amount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  dateRange: z
    .enum(['last7days', 'last30days', 'last3months', 'last6months', 'lastyear'])
    .optional(),
});

export type TransactionQuery = z.infer<typeof transactionQuerySchema>;
