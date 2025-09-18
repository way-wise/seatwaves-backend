-- prisma/migrations/20250917_add_booking/migration.sql
ALTER TYPE "PointRuleAction" ADD VALUE IF NOT EXISTS 'BOOKING';
