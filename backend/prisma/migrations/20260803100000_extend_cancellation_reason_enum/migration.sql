-- ============================================================================
-- Migration: extend_cancellation_reason_enum
-- Phase 1 — REQ-DB-001: Extend CancellationReason enum with 4 new values
--
-- Adds BUYER_REMORSE, WRONG_ITEM, FOUND_BETTER_PRICE, NOT_NEEDED to the
-- existing CancellationReason enum. This aligns the DB enum with the design
-- doc's 9-value specification while preserving backward compatibility with
-- existing orders that use the original 5 values.
--
-- PostgreSQL ALTER TYPE ... ADD VALUE is additive and non-destructive — it
-- never removes existing values or invalidates existing row data.
--
-- Rollback: PostgreSQL does not support DROP VALUE on enum types. To undo
-- this migration, a new enum type must be created without the 4 new values,
-- data migrated, old type dropped, and the new type renamed. See ROLLBACK
-- section below.
-- ============================================================================

-- AlterEnum: Add new values to CancellationReason (order matters for
-- readability only; PG stores enum values by OID, not position).
ALTER TYPE "CancellationReason" ADD VALUE 'BUYER_REMORSE';
ALTER TYPE "CancellationReason" ADD VALUE 'WRONG_ITEM';
ALTER TYPE "CancellationReason" ADD VALUE 'FOUND_BETTER_PRICE';
ALTER TYPE "CancellationReason" ADD VALUE 'NOT_NEEDED';

-- ============================================================================
-- ROLLBACK — PostgreSQL enum values cannot be dropped.
-- To reverse this migration, execute the following steps:
--
-- 1. Create a new enum type with only the original 5 values:
--    CREATE TYPE "CancellationReason_new" AS ENUM (
--      'CUSTOMER_REQUEST', 'OUT_OF_STOCK', 'FRAUD', 'ADMIN_OVERRIDE', 'OTHER'
--    );
--
-- 2. Migrate existing rows (if any orders use the new enum values, decide
--    where to map them — default to 'OTHER'):
--    UPDATE "orders" SET "cancellation_reason" = 'OTHER'
--      WHERE "cancellation_reason" IN (
--        'BUYER_REMORSE', 'WRONG_ITEM', 'FOUND_BETTER_PRICE', 'NOT_NEEDED'
--      );
--
-- 3. Alter the column to use the new type:
--    ALTER TABLE "orders"
--      ALTER COLUMN "cancellation_reason" TYPE "CancellationReason_new"
--      USING "cancellation_reason"::text::"CancellationReason_new";
--
-- 4. Drop the old type and rename:
--    DROP TYPE "CancellationReason";
--    ALTER TYPE "CancellationReason_new" RENAME TO "CancellationReason";
-- ============================================================================
