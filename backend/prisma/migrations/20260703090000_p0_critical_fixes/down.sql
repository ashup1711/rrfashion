-- Rollback for 20260703090000_p0_critical_fixes
--
-- Reverses the schema changes applied by the forward migration. Statements use
-- `IF EXISTS` so the rollback is safe to rerun.

-- Drop foreign key first so the dependent index can be removed safely.
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_order_item_id_fkey";

-- Drop indexes created by the forward migration.
DROP INDEX IF EXISTS "reviews_order_item_id_key";
DROP INDEX IF EXISTS "reviews_order_item_id_idx";
DROP INDEX IF EXISTS "products_isActive_deletedAt_salePrice_idx";
DROP INDEX IF EXISTS "orders_userId_createdAt_idx";
DROP INDEX IF EXISTS "orders_userId_status_idx";
DROP INDEX IF EXISTS "processed_webhook_events_event_type_created_at_idx";
DROP INDEX IF EXISTS "processed_webhook_events_event_id_key";

-- Drop the durable webhook deduplication table.
DROP TABLE IF EXISTS "processed_webhook_events";

-- Drop columns added to existing tables.
ALTER TABLE "reviews" DROP COLUMN IF EXISTS "order_item_id";
ALTER TABLE "rental_bookings" DROP COLUMN IF EXISTS "preAuthStatus";
ALTER TABLE "rental_bookings" DROP COLUMN IF EXISTS "razorpayPreAuthId";
ALTER TABLE "products" DROP COLUMN IF EXISTS "version";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "preAuthStatus";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "razorpayPreAuthId";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "version";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "pdfStorageKey";
