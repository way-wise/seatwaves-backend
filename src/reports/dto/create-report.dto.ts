import { z } from 'zod';

export const reportTargetTypeEnum = z.enum([
  'USER',
  'BOOKING',
  'EVENT',
  'TRANSACTION',
  'MESSAGE',
  'OTHER',
]);

export const reportTypeEnum = z.enum([
  'FRAUD',
  'SCAM',
  'SPAM',
  'ABUSE',
  'PAYMENT_ISSUE',
  'BOOKING_ISSUE',
  'EVENT_ISSUE',
  'PLATFORM_BUG',
  'OTHER',
]);

export const reportSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

export const createReportSchema = z
  .object({
    targetType: reportTargetTypeEnum,
    type: reportTypeEnum.default('OTHER'),
    severity: reportSeverityEnum.default('MEDIUM'),
    subject: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    attachments: z.array(z.string()).optional().default([]),
    metadata: z.any().optional(),

    // Target references
    reportedUserId: z.string().optional(),
    bookingId: z.string().optional(),
    eventId: z.string().optional(),
    transactionId: z.string().optional(),
    messageId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Require a matching target id based on targetType
    const req = (path: string) =>
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${data.targetType} target id is required`,
        path: [path],
      });

    switch (data.targetType) {
      case 'USER':
        if (!data.reportedUserId) req('reportedUserId');
        break;
      case 'BOOKING':
        if (!data.bookingId) req('bookingId');
        break;
      case 'EVENT':
        if (!data.eventId) req('eventId');
        break;
      case 'TRANSACTION':
        if (!data.transactionId) req('transactionId');
        break;
      case 'MESSAGE':
        if (!data.messageId) req('messageId');
        break;
      case 'OTHER':
      default:
        // no required specific id
        break;
    }

    // At least one of subject/description should exist
    if (!data.subject && !data.description) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either subject or description is required',
        path: ['description'],
      });
    }
  });

export type CreateReportDto = z.infer<typeof createReportSchema>;
