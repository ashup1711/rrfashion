-- ============================================================================
-- Migration: add_guest_addresses_and_orders
-- Phase 2 of guest user enhancement
--
-- Purpose:
--   Expand the GuestSession system to support addresses, orders, and reviews
--   for unauthenticated users. This replaces the legacy User-based guest
--   system for checkout.
--
-- Changes:
--   1. Create guest_addresses table (addresses for guest sessions)
--   2. Add guest_session_id to orders table (nullable)
--   3. Add guest_session_id to reviews table (nullable, make userId nullable)
--   4. Add foreign key constraints with appropriate onDelete behavior
--   5. Add indexes on guest_session_id columns for query performance
--
-- onDelete behavior:
--   - GuestAddress → GuestSession: CASCADE (delete addresses with session)
--   - Order → GuestSession: SET NULL (keep orders if session is deleted)
--   - Review → GuestSession: SET NULL (keep reviews if session is deleted)
-- ============================================================================

-- 1. Create guest_addresses table
CREATE TABLE "guest_addresses" (
    "id" TEXT NOT NULL,
    "guest_session_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_addresses_pkey" PRIMARY KEY ("id")
);

-- 2. Add guest_session_id column to existing tables
ALTER TABLE "orders" ADD COLUMN "guest_session_id" TEXT;

ALTER TABLE "reviews" ADD COLUMN "guest_session_id" TEXT;
ALTER TABLE "reviews" ALTER COLUMN "userId" DROP NOT NULL;

-- 3. Create indexes for guest_session_id lookups
CREATE INDEX "guest_addresses_guest_session_id_idx" ON "guest_addresses"("guest_session_id");
CREATE INDEX "orders_guest_session_id_idx" ON "orders"("guest_session_id");
CREATE INDEX "orders_guest_session_id_createdAt_idx" ON "orders"("guest_session_id", "createdAt");
CREATE INDEX "reviews_guest_session_id_idx" ON "reviews"("guest_session_id");

-- 4. Add foreign key constraints
ALTER TABLE "guest_addresses" ADD CONSTRAINT "guest_addresses_guest_session_id_fkey"
    FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_guest_session_id_fkey"
    FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guest_session_id_fkey"
    FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ROLLBACK (run in reverse order to undo this migration)
-- ============================================================================
-- /*
-- -- 1. Drop foreign key constraints
-- ALTER TABLE "reviews" DROP CONSTRAINT "reviews_guest_session_id_fkey";
-- ALTER TABLE "orders" DROP CONSTRAINT "orders_guest_session_id_fkey";
-- ALTER TABLE "guest_addresses" DROP CONSTRAINT "guest_addresses_guest_session_id_fkey";
-- 
-- -- 2. Drop indexes
-- DROP INDEX IF EXISTS "reviews_guest_session_id_idx";
-- DROP INDEX IF EXISTS "orders_guest_session_id_createdAt_idx";
-- DROP INDEX IF EXISTS "orders_guest_session_id_idx";
-- DROP INDEX IF EXISTS "guest_addresses_guest_session_id_idx";
-- 
-- -- 3. Revert Reviews: make userId NOT NULL again and drop guest_session_id
-- ALTER TABLE "reviews" ALTER COLUMN "userId" SET NOT NULL;
-- ALTER TABLE "reviews" DROP COLUMN "guest_session_id";
-- 
-- -- 4. Drop guest_session_id from orders
-- ALTER TABLE "orders" DROP COLUMN "guest_session_id";
-- 
-- -- 5. Drop guest_addresses table
-- DROP TABLE IF EXISTS "guest_addresses";
-- */
