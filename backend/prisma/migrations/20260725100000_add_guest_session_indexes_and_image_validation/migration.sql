-- ============================================================================
-- Migration: add_guest_session_indexes_and_image_validation
-- Part of: Global Fix Pipeline — Database layer
--
-- Purpose:
--   REQ-DB-001: Add composite index on GuestSession (expiresAt, lastActivityAt)
--               for efficient TTL-based cleanup queries
--   REQ-DB-002: Make fileSize and mimeType required with defaults on ProductImage
--               Add composite index (variantId, variantType) for product queries
--   REQ-DB-003: Add unique constraint on ProductImage.storageKey
--   REQ-DB-004: Create PostgreSQL function for expired guest session cleanup
--
-- Changes:
--   1. Create composite index on guest_sessions(expires_at, last_activity_at)
--   2. Backfill NULL file_size → 0, NULL mime_type → 'image/webp'
--   3. ALTER file_size SET NOT NULL and SET DEFAULT 0
--   4. ALTER mime_type SET NOT NULL and SET DEFAULT 'image/webp'
--   5. Create composite index product_images(variant_id, variant_type)
--   6. Create unique index on product_images(storage_key)
--   7. Create cleanup_expired_guest_sessions() PostgreSQL function
-- ============================================================================

-- ============================================================================
-- 1. REQ-DB-001: Composite index on GuestSession for efficient cleanup
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS "guest_sessions_expires_at_last_activity_at_idx"
  ON "guest_sessions"("expires_at", "last_activity_at");

-- ============================================================================
-- 2-4. REQ-DB-002: Backfill and enforce NOT NULL on file_size and mime_type
-- ============================================================================

-- Backfill existing NULL file_size values
UPDATE "product_images" SET "file_size" = 0 WHERE "file_size" IS NULL;

-- Backfill existing NULL mime_type values
UPDATE "product_images" SET "mime_type" = 'image/webp' WHERE "mime_type" IS NULL;

-- Alter file_size to NOT NULL with default
ALTER TABLE "product_images" ALTER COLUMN "file_size" SET DEFAULT 0;
ALTER TABLE "product_images" ALTER COLUMN "file_size" SET NOT NULL;

-- Alter mime_type to NOT NULL with default
ALTER TABLE "product_images" ALTER COLUMN "mime_type" SET DEFAULT 'image/webp';
ALTER TABLE "product_images" ALTER COLUMN "mime_type" SET NOT NULL;

-- ============================================================================
-- 5. REQ-DB-002: Composite index for product image queries by variant + type
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS "product_images_variant_id_variant_type_idx"
  ON "product_images"("variant_id", "variant_type");

-- ============================================================================
-- 6. REQ-DB-003: Unique constraint on storageKey
--    PostgreSQL allows multiple NULL values in unique constraints,
--    so this is safe even with existing NULL storage_keys.
-- ============================================================================
-- Prisma naming convention: tablename_fieldname_key
-- First clean up any duplicate NULLs (already allowed), then create unique
-- Since storage_key column is TEXT and PG treats NULLs as distinct in unique
-- constraints, multiple NULLs are fine. We only need to ensure no duplicate
-- non-NULL values exist before creating the constraint.

-- Remove any existing non-unique index on storage_key to replace with unique
DROP INDEX IF EXISTS "product_images_storage_key_idx";

-- Create unique index (PG allows multiple NULLs)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "product_images_storage_key_key"
  ON "product_images"("storage_key");

-- ============================================================================
-- 7. REQ-DB-004: PostgreSQL function for expired guest session cleanup
--    Cron job (NestJS @Cron) will call this via Prisma.$queryRaw or
--    the existing GuestSessionService.cleanupExpired() method.
--    This function provides a raw SQL alternative that can be invoked
--    directly from the database or via scheduled tasks.
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_guest_sessions()
RETURNS TABLE (
  deleted_sessions bigint,
  deleted_cart_items bigint,
  deleted_wishlist_items bigint,
  deleted_addresses bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted_sessions bigint;
  v_deleted_cart_items bigint;
  v_deleted_wishlist_items bigint;
  v_deleted_addresses bigint;
BEGIN
  -- Delete guest addresses first (FK to guest_sessions)
  DELETE FROM "guest_addresses"
  WHERE "guest_session_id" IN (
    SELECT "id" FROM "guest_sessions" WHERE "expires_at" < NOW()
  );
  GET DIAGNOSTICS v_deleted_addresses = ROW_COUNT;

  -- Delete guest wishlist items (FK to guest_sessions)
  DELETE FROM "guest_wishlist_items"
  WHERE "guest_session_id" IN (
    SELECT "id" FROM "guest_sessions" WHERE "expires_at" < NOW()
  );
  GET DIAGNOSTICS v_deleted_wishlist_items = ROW_COUNT;

  -- Delete guest cart items (FK to guest_sessions)
  DELETE FROM "guest_cart_items"
  WHERE "guest_session_id" IN (
    SELECT "id" FROM "guest_sessions" WHERE "expires_at" < NOW()
  );
  GET DIAGNOSTICS v_deleted_cart_items = ROW_COUNT;

  -- Set guest_session_id to NULL on orders (FK with onDelete: SetNull)
  UPDATE "orders"
  SET "guest_session_id" = NULL
  WHERE "guest_session_id" IN (
    SELECT "id" FROM "guest_sessions" WHERE "expires_at" < NOW()
  );

  -- Set guest_session_id to NULL on reviews (FK with onDelete: SetNull)
  UPDATE "reviews"
  SET "guest_session_id" = NULL
  WHERE "guest_session_id" IN (
    SELECT "id" FROM "guest_sessions" WHERE "expires_at" < NOW()
  );

  -- Delete expired guest sessions themselves
  DELETE FROM "guest_sessions"
  WHERE "expires_at" < NOW();
  GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;

  RETURN QUERY SELECT
    v_deleted_sessions,
    v_deleted_cart_items,
    v_deleted_wishlist_items,
    v_deleted_addresses;
END;
$$;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- /*
-- -- Drop the function
-- DROP FUNCTION IF EXISTS cleanup_expired_guest_sessions();
--
-- -- Drop unique index on storage_key
-- DROP INDEX IF EXISTS "product_images_storage_key_key";
--
-- -- Recreate old non-unique index
-- CREATE INDEX "product_images_storage_key_idx" ON "product_images"("storage_key");
--
-- -- Drop composite index
-- DROP INDEX IF EXISTS "product_images_variant_id_variant_type_idx";
--
-- -- Revert mime_type to nullable
-- ALTER TABLE "product_images" ALTER COLUMN "mime_type" DROP NOT NULL;
-- ALTER TABLE "product_images" ALTER COLUMN "mime_type" DROP DEFAULT;
--
-- -- Revert file_size to nullable
-- ALTER TABLE "product_images" ALTER COLUMN "file_size" DROP NOT NULL;
-- ALTER TABLE "product_images" ALTER COLUMN "file_size" DROP DEFAULT;
--
-- -- Drop composite index on guest_sessions
-- DROP INDEX IF EXISTS "guest_sessions_expires_at_last_activity_at_idx";
-- */
