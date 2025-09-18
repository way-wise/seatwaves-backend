import { z } from 'zod';
import {
  ExperienceStatusEnum,
  ScheduleTypeEnum,
  DiscountTypeEnum,
  FrequencyEnum,
} from '../../common/enums';
import { EventStatus } from '@prisma/client';

export const recurrenceRuleDto = z.object({
  frequency: FrequencyEnum,
  interval: z.number().int().optional().default(1),
  byday: z.array(z.string()).optional(),
  count: z.number().int().optional(),
  until: z.coerce.date().optional(),
  openWindowDays: z.number().int().positive().optional(),
});

export type RecurrenceRuleDto = z.infer<typeof recurrenceRuleDto>;

export const createExperienceDto = z.object({
  name: z.string(),
  shortDesc: z.string(),
  address: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  slug: z.string().optional(),
  country: z.string(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  scheduleType: ScheduleTypeEnum.default('ONTIME'),
  cancelPolicy: z.string().optional(),
  refundable: z.boolean().optional().default(false),
  cancellationFee: z.coerce.number().optional(),
  detailsDesc: z.string().optional(),
  includes: z.array(z.string()).optional(),
  notes: z.string().optional(),
  guestRequirements: z.string().optional(),
  agreement: z.string().optional(),
  tags: z.array(z.string()).optional(),
  categoryId: z.string().ulid(),
  status: ExperienceStatusEnum.optional(),
  frequency: FrequencyEnum.optional(),
  interval: z.number().int().optional(),
  byday: z.array(z.string()).optional(),
  count: z.number().int().optional(),
  until: z.coerce.date().optional(),
  startDate: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
  maxGuest: z.number().int(),
  maxperSlot: z.number().int(),
  maxparticipants: z.number().int(),
  activities: z.array(z.string()).optional(),
  timeslots: z.array(z.string()).optional(),
  endDate: z.coerce.date().optional(),
  isRecurring: z.boolean().default(false),
  discountType: DiscountTypeEnum.optional(),
  discount: z.coerce.number().optional(),
  price: z.coerce.number(),
  eventStatus: z.nativeEnum(EventStatus).default(EventStatus.SCHEDULE),
  openWindowDays: z.number().int().positive().optional(),
  recurrence: recurrenceRuleDto.optional(),
});

export type CreateExperienceDto = z.infer<typeof createExperienceDto>;

export const updateExperienceSchema = createExperienceDto.partial();

export type UpdateExperienceDto = z.infer<typeof updateExperienceSchema>;
