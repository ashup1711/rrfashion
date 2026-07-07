-- Create StockMovementType enum if it doesn't exist (schema drift fix)
DO $$ BEGIN
  CREATE TYPE "StockMovementType" AS ENUM (
    'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'MANUAL',
    'TRANSFER_IN', 'TRANSFER_OUT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new values to the enum (safe to re-run)
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'LOCK';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'UNLOCK';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'RESERVATION';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "StockMovementType" ADD VALUE 'SALE_FINAL';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Add quantityLocked column to inventory_summary
ALTER TABLE "inventory_summary" ADD COLUMN IF NOT EXISTS "quantityLocked" INTEGER NOT NULL DEFAULT 0;

-- Add index for queries filtering by quantityLocked > 0
CREATE INDEX IF NOT EXISTS "inventory_summary_locked_idx" ON "inventory_summary" ("storeId", "quantityLocked") WHERE "quantityLocked" > 0;
