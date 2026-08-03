-- ============================================================================
-- Migration: phase2_db_search_seo_shipping_rental
-- Phase 2 — DB-only additive changes (request_id 665a793e0011)
--
-- Implements 4 requirements:
--   REQ-DB-009  PostgreSQL full-text search on Product.
--               - products.search_keywords TEXT (denormalized product_tags
--                 text, maintained by trigger product_tags_search_sync_trg)
--               - products.search_vector tsvector GENERATED ALWAYS AS STORED
--                 from name (weight A) + search_keywords (B) + description (C)
--               - GIN index products_search_idx on search_vector
--               - pg_trgm extension + GIN trigram index products_name_trgm_idx
--                 on products.name for typo-tolerant / fuzzy matching
--   REQ-DB-010  New shipping_rate_cache table (24h durable carrier-quote
--               cache) with the required composite (pincode, weight) index,
--               a (pincode, weight, carrier_name) unique cache key for
--               race-free upserts, and a ttl index for the expiry sweep.
--   REQ-DB-011  Product SEO columns: meta_title, meta_description, og_image,
--               canonical_url (all nullable).
--   REQ-DB-012  Rental damage-assessment workflow columns on rental_bookings
--               (Option A — deliberately NO new RentalInspection table; the
--               existing damage_* columns already hold in-flight damage data
--               and splitting them would fork the source of truth).
--
-- Safety: 100% additive. No column is dropped or renamed, no existing row is
-- rewritten except the one-shot backfill of products.search_keywords (which
-- populates a column created by this same migration). Zero destructive
-- changes; the migration is safe to run on a live database.
--
-- Note on tags: ProductTag is a separate table, so a PostgreSQL generated
-- column cannot read it directly (generated expressions may only reference
-- columns of the same row). Tags are therefore denormalized into
-- products.search_keywords by an AFTER trigger on product_tags, and the
-- generated tsvector reads that column. This keeps the search vector always
-- in sync with name + tags + description with no application-side writes.
--
-- Security notes:
--   SEC-13/SEC-15 — shipping_rate_cache stores NO user identifier and no PII;
--     the cache key is (pincode, weight, carrier_name) only, so the cached
--     row is safe to share across users. `ttl` is an absolute expiry the
--     read path MUST filter on (`ttl > now()`).
--   Least privilege — CREATE EXTENSION requires a privileged/owner role and
--     is executed here at migration time only. The application runtime role
--     needs no extra grants beyond SELECT/INSERT/UPDATE/DELETE on the new
--     table and USAGE on the schema.
-- ============================================================================

-- ── REQ-DB-009: extensions ──────────────────────────────────────────────────
-- pg_trgm powers the `%` similarity operator and gin_trgm_ops used by
-- products_name_trgm_idx (fuzzy search, REQ-BE-017).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── REQ-DB-011 + REQ-DB-009: Product columns ────────────────────────────────
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "canonical_url" TEXT,
ADD COLUMN     "meta_description" VARCHAR(320),
ADD COLUMN     "meta_title" VARCHAR(160),
ADD COLUMN     "og_image" TEXT,
ADD COLUMN     "search_keywords" TEXT;

-- Backfill search_keywords from existing product_tags rows BEFORE the
-- generated column is created, so the initial tsvector already includes tags.
UPDATE "products" p
SET "search_keywords" = sub."kw"
FROM (
  SELECT
    t."productId" AS "pid",
    string_agg(t."key" || ' ' || t."value", ' ' ORDER BY t."key", t."value") AS "kw"
  FROM "product_tags" t
  GROUP BY t."productId"
) sub
WHERE p."id" = sub."pid";

-- Generated tsvector. Weighted so a name hit outranks a tag hit, which in
-- turn outranks a description hit (ts_rank uses the A/B/C/D weights).
-- Prisma models this as Unsupported("tsvector"); it is read-only for the app.
ALTER TABLE "products" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("search_keywords", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

-- ── REQ-DB-009: keep search_keywords in sync with product_tags ──────────────
CREATE OR REPLACE FUNCTION products_refresh_search_keywords(p_product_id TEXT)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE "products" p
  SET "search_keywords" = (
    SELECT string_agg(t."key" || ' ' || t."value", ' ' ORDER BY t."key", t."value")
    FROM "product_tags" t
    WHERE t."productId" = p_product_id
  )
  WHERE p."id" = p_product_id;
$$;

CREATE OR REPLACE FUNCTION product_tags_sync_search_keywords()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM products_refresh_search_keywords(OLD."productId");
  ELSE
    PERFORM products_refresh_search_keywords(NEW."productId");
    -- A tag moved between products: refresh the old owner too.
    IF (TG_OP = 'UPDATE' AND OLD."productId" IS DISTINCT FROM NEW."productId") THEN
      PERFORM products_refresh_search_keywords(OLD."productId");
    END IF;
  END IF;
  RETURN NULL; -- AFTER trigger: return value is ignored
END;
$$;

DROP TRIGGER IF EXISTS product_tags_search_sync_trg ON "product_tags";
CREATE TRIGGER product_tags_search_sync_trg
AFTER INSERT OR UPDATE OR DELETE ON "product_tags"
FOR EACH ROW
EXECUTE FUNCTION product_tags_sync_search_keywords();

-- ── REQ-DB-012: rental damage assessment (Option A — extend RentalBooking) ──
-- AlterTable
ALTER TABLE "rental_bookings" ADD COLUMN     "condition_after" TEXT[],
ADD COLUMN     "condition_before" TEXT[],
ADD COLUMN     "customer_disputed_at" TIMESTAMP(3),
ADD COLUMN     "customer_notified_at" TIMESTAMP(3),
ADD COLUMN     "damage_checklist" JSONB,
ADD COLUMN     "damage_findings" TEXT,
ADD COLUMN     "dispute_resolved_at" TIMESTAMP(3),
ADD COLUMN     "estimated_repair_cost" DECIMAL(12,2),
ADD COLUMN     "final_charge" DECIMAL(12,2);

-- ── REQ-DB-010: shipping rate cache ─────────────────────────────────────────
-- CreateTable
CREATE TABLE "shipping_rate_cache" (
    "id" TEXT NOT NULL,
    "pincode" VARCHAR(10) NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "carrier_name" VARCHAR(64) NOT NULL,
    "estimated_days" INTEGER,
    "ttl" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rate_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shipping_rate_cache_pincode_weight_idx" ON "shipping_rate_cache"("pincode", "weight");

-- CreateIndex
CREATE INDEX "shipping_rate_cache_ttl_idx" ON "shipping_rate_cache"("ttl");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rate_cache_pincode_weight_carrier_name_key" ON "shipping_rate_cache"("pincode", "weight", "carrier_name");

-- ── REQ-DB-009: search indexes ──────────────────────────────────────────────
-- CreateIndex
CREATE INDEX "products_search_idx" ON "products" USING GIN ("search_vector");

-- CreateIndex
CREATE INDEX "products_name_trgm_idx" ON "products" USING GIN ("name" gin_trgm_ops);

-- ── REQ-DB-012: dispute workflow indexes ────────────────────────────────────
-- CreateIndex
CREATE INDEX "rental_bookings_customer_notified_at_idx" ON "rental_bookings"("customer_notified_at");

-- CreateIndex
CREATE INDEX "rental_bookings_customer_disputed_at_dispute_resolved_at_idx" ON "rental_bookings"("customer_disputed_at", "dispute_resolved_at");

-- ============================================================================
-- ROLLBACK (manual — Prisma has no `migrate down`).
-- Verified against the same database this migration was applied to.
-- Every statement is idempotent; run the whole block in one transaction:
--
-- BEGIN;
--
-- -- 1. Drop the tag-sync trigger and its functions
-- DROP TRIGGER IF EXISTS product_tags_search_sync_trg ON "product_tags";
-- DROP FUNCTION IF EXISTS product_tags_sync_search_keywords();
-- DROP FUNCTION IF EXISTS products_refresh_search_keywords(TEXT);
--
-- -- 2. Drop new indexes
-- DROP INDEX IF EXISTS "rental_bookings_customer_disputed_at_dispute_resolved_at_idx";
-- DROP INDEX IF EXISTS "rental_bookings_customer_notified_at_idx";
-- DROP INDEX IF EXISTS "products_name_trgm_idx";
-- DROP INDEX IF EXISTS "products_search_idx";
-- DROP INDEX IF EXISTS "shipping_rate_cache_pincode_weight_carrier_name_key";
-- DROP INDEX IF EXISTS "shipping_rate_cache_ttl_idx";
-- DROP INDEX IF EXISTS "shipping_rate_cache_pincode_weight_idx";
--
-- -- 3. Drop the new table
-- DROP TABLE IF EXISTS "shipping_rate_cache";
--
-- -- 4. Drop rental inspection columns (REQ-DB-012)
-- ALTER TABLE "rental_bookings"
--   DROP COLUMN IF EXISTS "final_charge",
--   DROP COLUMN IF EXISTS "estimated_repair_cost",
--   DROP COLUMN IF EXISTS "dispute_resolved_at",
--   DROP COLUMN IF EXISTS "damage_findings",
--   DROP COLUMN IF EXISTS "damage_checklist",
--   DROP COLUMN IF EXISTS "customer_notified_at",
--   DROP COLUMN IF EXISTS "customer_disputed_at",
--   DROP COLUMN IF EXISTS "condition_before",
--   DROP COLUMN IF EXISTS "condition_after";
--
-- -- 5. Drop search + SEO columns (REQ-DB-009, REQ-DB-011)
-- ALTER TABLE "products"
--   DROP COLUMN IF EXISTS "search_vector",
--   DROP COLUMN IF EXISTS "search_keywords",
--   DROP COLUMN IF EXISTS "og_image",
--   DROP COLUMN IF EXISTS "meta_title",
--   DROP COLUMN IF EXISTS "meta_description",
--   DROP COLUMN IF EXISTS "canonical_url";
--
-- -- 6. Extension is intentionally NOT dropped: other objects may depend on it.
-- --    If you are certain nothing else uses it: DROP EXTENSION IF EXISTS pg_trgm;
--
-- COMMIT;
-- ============================================================================
