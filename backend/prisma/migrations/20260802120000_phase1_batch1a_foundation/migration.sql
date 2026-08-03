-- ============================================================================
-- Migration: phase1_batch1a_foundation
-- Phase 1 Batch 1A — DB-only additive foundation changes
--
-- Implements 8 requirements from the Phase 1 gap-closure plan:
--   REQ-DB-001  Add Order.cancelledBy, Order.cancellationReason (enum)
--               (Order.cancelledAt already existed at schema.prisma:569)
--   REQ-DB-002  Extend existing OrderStatusLog with actorType ActorType?,
--               reason, metadata. DO NOT create a parallel OrderStatusHistory.
--   REQ-DB-003  Make Cart.userId nullable, add Cart.guestSessionId @unique,
--               Cart.abandonedAt, Cart.recoveredAt, @@index([updatedAt]),
--               @@index([abandonedAt]) — supports lazy migration of guest
--               cart rows from GuestCartItem on first read.
--   REQ-DB-004  Add CartItem.addedAt (default now), CartItem.priceSnapshot.
--               Composite index on (cartId, addedAt) for "recently added" reads.
--   REQ-DB-005  New ReturnRequest table with ReturnStatus enum and indexes.
--   REQ-DB-006  New ReturnRequestItem table with ReturnReason/ReturnItemStatus
--               enums; photos[]; FK to OrderItem with RESTRICT (cannot
--               delete an order item that has been returned).
--   REQ-DB-007  New Refund table; 1:many with Order (partial refunds).
--               razorpayRefundId is @unique for idempotency.
--   REQ-DB-008  New InventoryReconciliationLog table; (runAt, resolved) and
--               (resolved, runAt) composite indexes for the
--               unresolved-recent-mismatches admin dashboard.
--
-- All changes are additive (new columns nullable, new tables). No existing
-- rows are modified. FKs use onDelete: Cascade for child data that has no
-- value without the parent (e.g. ReturnRequestItem → ReturnRequest,
-- ReturnRequestItem → OrderItem with Restrict to preserve audit), and
-- onDelete: Restrict for monetary state (Refund → Order) and SetNull for
-- optional back-pointers.
--
-- Data loss note (REQ-DB-007): past refund details were not persisted before
-- this migration. Only refunds created after this migration are recorded.
-- ============================================================================

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('CUSTOMER_REQUEST', 'OUT_OF_STOCK', 'FRAUD', 'ADMIN_OVERRIDE', 'OTHER');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM', 'GUEST');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('SIZE_ISSUE', 'DEFECT', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('INITIATED', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "price_snapshot" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "abandoned_at" TIMESTAMP(3),
ADD COLUMN     "guest_session_id" TEXT,
ADD COLUMN     "recovered_at" TIMESTAMP(3),
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "order_status_logs" ADD COLUMN     "actor_type" "ActorType",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "reason" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancellation_reason" "CancellationReason",
ADD COLUMN     "cancelled_by" TEXT;

-- CreateTable
CREATE TABLE "return_requests" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "admin_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_request_items" (
    "id" TEXT NOT NULL,
    "return_request_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "photos" TEXT[],
    "notes" TEXT,
    "status" "ReturnItemStatus" NOT NULL DEFAULT 'PENDING',
    "refund_amount" DECIMAL(12,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "return_request_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "razorpay_refund_id" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'INITIATED',
    "reason" TEXT,
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reconciliation_logs" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "expected_qty" INTEGER NOT NULL,
    "actual_qty" INTEGER NOT NULL,
    "discrepancy" INTEGER NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_reconciliation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_requests_order_id_created_at_idx" ON "return_requests"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "return_requests_status_idx" ON "return_requests"("status");

-- CreateIndex
CREATE INDEX "return_requests_order_id_status_idx" ON "return_requests"("order_id", "status");

-- CreateIndex
CREATE INDEX "return_request_items_return_request_id_idx" ON "return_request_items"("return_request_id");

-- CreateIndex
CREATE INDEX "return_request_items_order_item_id_idx" ON "return_request_items"("order_item_id");

-- CreateIndex
CREATE INDEX "return_request_items_status_idx" ON "return_request_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_razorpay_refund_id_key" ON "refunds"("razorpay_refund_id");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE INDEX "refunds_return_request_id_idx" ON "refunds"("return_request_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "refunds_order_id_status_idx" ON "refunds"("order_id", "status");

-- CreateIndex
CREATE INDEX "refunds_initiated_at_idx" ON "refunds"("initiated_at");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_logs_run_at_resolved_idx" ON "inventory_reconciliation_logs"("run_at", "resolved");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_logs_product_id_idx" ON "inventory_reconciliation_logs"("product_id");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_logs_variant_id_idx" ON "inventory_reconciliation_logs"("variant_id");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_logs_resolved_run_at_idx" ON "inventory_reconciliation_logs"("resolved", "run_at");

-- CreateIndex
CREATE INDEX "cart_items_cartId_added_at_idx" ON "cart_items"("cartId", "added_at");

-- CreateIndex
CREATE UNIQUE INDEX "carts_guest_session_id_key" ON "carts"("guest_session_id");

-- CreateIndex
CREATE INDEX "carts_updatedAt_idx" ON "carts"("updatedAt");

-- CreateIndex
CREATE INDEX "carts_abandoned_at_idx" ON "carts"("abandoned_at");

-- CreateIndex
CREATE INDEX "order_status_logs_actor_type_idx" ON "order_status_logs"("actor_type");

-- AddForeignKey
ALTER TABLE "return_requests" ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request_items" ADD CONSTRAINT "return_request_items_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_request_items" ADD CONSTRAINT "return_request_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_logs" ADD CONSTRAINT "inventory_reconciliation_logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reconciliation_logs" ADD CONSTRAINT "inventory_reconciliation_logs_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- ROLLBACK (run in reverse order to undo this migration)
-- ============================================================================
-- /*
-- -- 1. Drop FKs added in this migration
-- ALTER TABLE "inventory_reconciliation_logs" DROP CONSTRAINT "inventory_reconciliation_logs_variant_id_fkey";
-- ALTER TABLE "inventory_reconciliation_logs" DROP CONSTRAINT "inventory_reconciliation_logs_product_id_fkey";
-- ALTER TABLE "refunds" DROP CONSTRAINT "refunds_return_request_id_fkey";
-- ALTER TABLE "refunds" DROP CONSTRAINT "refunds_order_id_fkey";
-- ALTER TABLE "return_request_items" DROP CONSTRAINT "return_request_items_order_item_id_fkey";
-- ALTER TABLE "return_request_items" DROP CONSTRAINT "return_request_items_return_request_id_fkey";
-- ALTER TABLE "return_requests" DROP CONSTRAINT "return_requests_order_id_fkey";
--
-- -- 2. Drop new tables
-- DROP TABLE IF EXISTS "inventory_reconciliation_logs";
-- DROP TABLE IF EXISTS "refunds";
-- DROP TABLE IF EXISTS "return_request_items";
-- DROP TABLE IF EXISTS "return_requests";
--
-- -- 3. Drop new indexes
-- DROP INDEX IF EXISTS "order_status_logs_actor_type_idx";
-- DROP INDEX IF EXISTS "carts_abandoned_at_idx";
-- DROP INDEX IF EXISTS "carts_updatedAt_idx";
-- DROP INDEX IF EXISTS "carts_guest_session_id_key";
-- DROP INDEX IF EXISTS "cart_items_cartId_added_at_idx";
-- DROP INDEX IF EXISTS "inventory_reconciliation_logs_resolved_run_at_idx";
-- DROP INDEX IF EXISTS "inventory_reconciliation_logs_variant_id_idx";
-- DROP INDEX IF EXISTS "inventory_reconciliation_logs_product_id_idx";
-- DROP INDEX IF EXISTS "inventory_reconciliation_logs_run_at_resolved_idx";
-- DROP INDEX IF EXISTS "refunds_initiated_at_idx";
-- DROP INDEX IF EXISTS "refunds_order_id_status_idx";
-- DROP INDEX IF EXISTS "refunds_status_idx";
-- DROP INDEX IF EXISTS "refunds_return_request_id_idx";
-- DROP INDEX IF EXISTS "refunds_order_id_idx";
-- DROP INDEX IF EXISTS "refunds_razorpay_refund_id_key";
-- DROP INDEX IF EXISTS "return_request_items_status_idx";
-- DROP INDEX IF EXISTS "return_request_items_order_item_id_idx";
-- DROP INDEX IF EXISTS "return_request_items_return_request_id_idx";
-- DROP INDEX IF EXISTS "return_requests_order_id_status_idx";
-- DROP INDEX IF EXISTS "return_requests_status_idx";
-- DROP INDEX IF EXISTS "return_requests_order_id_created_at_idx";
--
-- -- 4. Revert column adds (Order / OrderStatusLog / Cart / CartItem)
-- ALTER TABLE "order_status_logs" DROP COLUMN "actor_type";
-- ALTER TABLE "order_status_logs" DROP COLUMN "metadata";
-- ALTER TABLE "order_status_logs" DROP COLUMN "reason";
-- ALTER TABLE "orders" DROP COLUMN "cancellation_reason";
-- ALTER TABLE "orders" DROP COLUMN "cancelled_by";
-- ALTER TABLE "cart_items" DROP COLUMN "added_at";
-- ALTER TABLE "cart_items" DROP COLUMN "price_snapshot";
-- ALTER TABLE "carts" DROP COLUMN "abandoned_at";
-- ALTER TABLE "carts" DROP COLUMN "guest_session_id";
-- ALTER TABLE "carts" DROP COLUMN "recovered_at";
-- -- Restore NOT NULL on Cart.userId (only safe if all rows have a userId)
-- -- ALTER TABLE "carts" ALTER COLUMN "userId" SET NOT NULL;
--
-- -- 5. Drop new enums
-- DROP TYPE IF EXISTS "RefundStatus";
-- DROP TYPE IF EXISTS "ReturnItemStatus";
-- DROP TYPE IF EXISTS "ReturnReason";
-- DROP TYPE IF EXISTS "ReturnStatus";
-- DROP TYPE IF EXISTS "ActorType";
-- DROP TYPE IF EXISTS "CancellationReason";
-- */

