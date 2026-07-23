-- ============================================================================
-- Migration: add_product_image_storage_fields
-- Part of: Product image upload with streaming multipart support
--
-- Purpose:
--   Enhance the ProductImage model with storage management capabilities:
--   - Add storageKey for file deletion/tracking
--   - Add image metadata (width, height, fileSize, mimeType)
--   - Add ImageVariantType enum for variant tracking (ORIGINAL, MEDIUM, THUMBNAIL)
--   - Add variant_type and parent_image_id for image variant relationships
--   - Drop old sizeType String column (replaced by variant_type enum)
--
-- Changes:
--   1. Create ImageVariantType enum (ORIGINAL, MEDIUM, THUMBNAIL)
--   2. Add storage_key, width, height, file_size, mime_type columns
--   3. Add variant_type column (replaces sizeType)
--   4. Drop old sizeType column
--   5. Add parent_image_id column with self-referencing FK
--   6. Add indexes on storage_key and parent_image_id
-- ============================================================================

-- 1. Create ImageVariantType enum
CREATE TYPE "ImageVariantType" AS ENUM ('ORIGINAL', 'MEDIUM', 'THUMBNAIL');

-- 2. Add new columns to product_images
ALTER TABLE "product_images"
  ADD COLUMN "storage_key" TEXT,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "file_size" INTEGER,
  ADD COLUMN "mime_type" TEXT;

-- 3. Add variant_type column (replaces sizeType)
ALTER TABLE "product_images"
  ADD COLUMN "variant_type" "ImageVariantType" NOT NULL DEFAULT 'ORIGINAL';

-- 4. Drop old sizeType column (replaced by variant_type enum)
ALTER TABLE "product_images" DROP COLUMN "sizeType";

-- 5. Add parent_image_id column for image variant hierarchy
ALTER TABLE "product_images"
  ADD COLUMN "parent_image_id" TEXT;

-- 6. Create indexes for query performance
CREATE INDEX "product_images_storage_key_idx" ON "product_images"("storage_key");
CREATE INDEX "product_images_parent_image_id_idx" ON "product_images"("parent_image_id");

-- 7. Add self-referencing foreign key for image variants
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_parent_image_id_fkey"
  FOREIGN KEY ("parent_image_id") REFERENCES "product_images"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- ROLLBACK (run in reverse order to undo this migration)
-- ============================================================================
-- /*
-- -- 1. Drop foreign key constraint
-- ALTER TABLE "product_images" DROP CONSTRAINT "product_images_parent_image_id_fkey";
-- 
-- -- 2. Drop indexes
-- DROP INDEX IF EXISTS "product_images_storage_key_idx";
-- DROP INDEX IF EXISTS "product_images_parent_image_id_idx";
-- 
-- -- 3. Re-add sizeType column (as it was before migration)
-- ALTER TABLE "product_images"
--   ADD COLUMN "sizeType" TEXT NOT NULL DEFAULT 'original';
-- 
-- -- 4. Drop new columns
-- ALTER TABLE "product_images"
--   DROP COLUMN "parent_image_id",
--   DROP COLUMN "variant_type",
--   DROP COLUMN "mime_type",
--   DROP COLUMN "file_size",
--   DROP COLUMN "height",
--   DROP COLUMN "width",
--   DROP COLUMN "storage_key";
-- 
-- -- 5. Drop enum
-- DROP TYPE IF EXISTS "ImageVariantType";
-- */
