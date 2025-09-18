// // import { ScheduleType } from '@prisma/client';
// // import { FrequencyEnum } from 'src/common/enums';
// // import { z } from 'zod';

// // export const recurrenceRuleDto = z.object({
// //   frequency: FrequencyEnum,
// //   interval: z.number().int().optional().default(1),
// //   byday: z.array(z.string()).optional(),
// //   count: z.number().int().optional(),
// //   until: z.coerce.date().optional(),
// // });

// // export const scheduleSchema = z.object({
// //   scheduleType: z.nativeEnum(ScheduleType).default(ScheduleType.ONTIME),
// //   startDate: z.coerce.date(),
// //   endDate: z.coerce.date(),
// //   timeslots: z.array(z.string()),
// //   startTime: z.string(),
// //   endTime: z.string(),
// //   maxPerSlot: z.number().int().min(1),
// //   recurrenceRule: recurrenceRuleDto.optional(),
// //   availableAt: z.coerce.date(),
// //   availableEndAt: z.coerce.date(),
// // });

// import { z } from 'zod';
// import { DayType, ScheduleType } from '@prisma/client';
// import { FrequencyEnum } from 'src/common/enums';

// export const recurrenceRuleDto = z.object({
//   frequency: FrequencyEnum,
//   interval: z.number().int().optional().default(1),
//   byday: z.array(z.nativeEnum(DayType)).optional(),
//   count: z.number().int().optional(),
//   until: z.coerce.date().optional(),
// });

// export const scheduleSchema = z
//   .object({
//     scheduleType: z.nativeEnum(ScheduleType).default(ScheduleType.ONTIME),
//     startDate: z.coerce.date(),
//     endDate: z.coerce.date(),
//     // Stored as JSON in Prisma, accept any array shape from UI
//     timeslots: z.array(z.any()).optional(),
//     recurrenceRules: recurrenceRuleDto.optional(),
//     openWindowDays: z.number().int().optional(),
//   })
//   .superRefine((data, ctx) => {
//     if (data.scheduleType === ScheduleType.RECURRING && !data.recurrenceRules) {
//       ctx.addIssue({
//         path: ['recurrenceRules'],
//         code: z.ZodIssueCode.custom,
//         message: 'recurrenceRule is required when scheduleType is RECURRING',
//       });
//     }

//     if (data.scheduleType === ScheduleType.ONTIME && data.recurrenceRules) {
//       ctx.addIssue({
//         path: ['recurrenceRules'],
//         code: z.ZodIssueCode.custom,
//         message: 'recurrenceRule must be empty for ONTIME schedule type',
//       });
//     }
//   });
