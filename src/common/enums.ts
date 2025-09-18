import { z } from 'zod';

export const RoleEnum = z.enum(['ADMIN', 'HOST', 'GUEST']);
export const UserStatusEnum = z.enum([
  'ACTIVE',
  'INACTIVE',
  'LOCKED',
  'BLOCKED',
  'BANNED',
  'PENDING',
  'SUSPENDED',
  'DELETED',
]);
export const ExperienceStatusEnum = z.enum([
  'APPROVED',
  'DRAFT',
  'PENDING',
  'PAUSED',
  'REJECTED',
  'DELETED',
]);

export const FrequencyEnum = z.enum([
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
]);
export const ScheduleTypeEnum = z.enum(['ONTIME', 'RECURRING', 'CUSTOM']);
export const DiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED']);
export const BookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'expired',
]);
export const CurrencyEnum = z.enum([
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'JPY',
  'KRW',
  'MXN',
  'NOK',
  'NZD',
  'SEK',
  'SGD',
  'TRY',
  'ZAR',
  'BDT',
]);
export const PaymentMethodEnum = z.enum(['card', 'paypal', 'bank_transfer']);
export const PaymentStatusEnum = z.enum(['pending', 'paid', 'failed']);
export const ReviewStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export const LanguageCodeEnum = z.enum(['en', 'bn', 'es', 'fr']);
export const NotificationTypeEnum = z.enum(['BOOKING', 'REVIEW', 'MESSAGE']);
