-- AlterEnum: Add new stock movement types for the locking feature
-- This migration adds four new values to the StockMovementType enum:
-- LOCK, UNLOCK, RESERVATION, SALE_FINAL
ALTER TYPE "StockMovementType" ADD VALUE 'LOCK';
ALTER TYPE "StockMovementType" ADD VALUE 'UNLOCK';
ALTER TYPE "StockMovementType" ADD VALUE 'RESERVATION';
ALTER TYPE "StockMovementType" ADD VALUE 'SALE_FINAL';

-- AlterTable: Add quantityLocked column to inventory_summary
-- This separates admin-initiated locks from checkout reservations.
-- quantityReserved will be used for customer checkout reservations,
-- quantityLocked for admin-initiated locks (e.g., photoshoot, try-in-store).
ALTER TABLE "inventory_summary" ADD COLUMN "quantityLocked" INTEGER NOT NULL DEFAULT 0;

-- Add index for queries filtering by quantityLocked > 0
CREATE INDEX IF NOT EXISTS "inventory_summary_locked_idx" ON "inventory_summary" ("storeId", "quantityLocked") WHERE "quantityLocked" > 0;
