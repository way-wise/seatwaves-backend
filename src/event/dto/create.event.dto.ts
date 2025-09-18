// import { DiscountType, Frequency } from '@prisma/client';
// import { Decimal } from '@prisma/client/runtime/library';

// export class RecurrenceRuleDto {
//   frequency: Frequency;
//   interval: number;
//   byday?: string[];
//   count?: number;
//   until?: Date;
//   openWindowDays?: number;
// }

// export class CreateEventDto {
//   userId: string;
//   experienceId: string;
//   scheduleType: 'ONTIME' | 'RECURRING' | 'CUSTOM';
//   title: string;
//   date: Date;
//   endDate: Date;
//   startTime: Date;
//   endTime: Date;
//   maxGuest: number;
//   maxperSlot: number | null;
//   price: Decimal;
//   discount: Decimal | 0;
//   discountType: DiscountType | null;
//   activities: any;
//   maxparticipants: number;
//   recurrence: RecurrenceRuleDto | null;
//   notes: string | null;
// }
