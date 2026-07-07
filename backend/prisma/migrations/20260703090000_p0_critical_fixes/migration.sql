-- P0 Critical Fixes + schema/migration drift cleanup
--
-- This migration:
--   1. Creates the durable `processed_webhook_events` table for Razorpay
--      webhook event-id deduplication (P0-002).
--   2. Adds `order_item_id` to `reviews` with a foreign key to `order_items(id)`,
--      a supporting index, and a unique constraint so each order item can only
--      be reviewed once (P0-005).
--   3. Adds the composite index `orders_userId_createdAt_idx` for order-list
--      performance.
--   4. Cleans up schema/migration drift by adding columns/indexes that were
--      declared in the Prisma schema but missing from earlier migrations:
--        - `invoices.pdfStorageKey`
--        - `orders.version`, `products.version` (optimistic locking)
--        - `payments.preAuthStatus`, `payments.razorpayPreAuthId`
--        - `rental_bookings.preAuthStatus`, `rental_bookings.razorpayPreAuthId`
--        - `products_isActive_deletedAt_salePrice_idx`
--        - `orders_userId_status_idx`

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "pdfStorageKey" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "preAuthStatus" TEXT,
ADD COLUMN     "razorpayPreAuthId" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "rental_bookings" ADD COLUMN     "preAuthStatus" TEXT,
ADD COLUMN     "razorpayPreAuthId" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "order_item_id" TEXT;

-- CreateTable
CREATE TABLE "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_events_event_id_key" ON "processed_webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "processed_webhook_events_event_type_created_at_idx" ON "processed_webhook_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "orders_userId_status_idx" ON "orders"("userId", "status");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "products_isActive_deletedAt_salePrice_idx" ON "products"("isActive", "deletedAt", "salePrice");

-- CreateIndex
CREATE INDEX "reviews_order_item_id_idx" ON "reviews"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_item_id_key" ON "reviews"("order_item_id");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
