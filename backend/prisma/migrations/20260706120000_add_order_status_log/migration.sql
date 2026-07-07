-- CreateTable: order_status_logs
-- Tracks order status changes for full audit trail
CREATE TABLE "order_status_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_logs_pkey" PRIMARY KEY ("id")
);

-- Index for looking up all logs for a specific order
CREATE INDEX "order_status_logs_order_id_idx" ON "order_status_logs"("order_id");

-- Composite index for chronological log queries per order
CREATE INDEX "order_status_logs_order_id_created_at_idx" ON "order_status_logs"("order_id", "created_at");

-- AddForeignKey: cascade delete logs when order is deleted
ALTER TABLE "order_status_logs"
    ADD CONSTRAINT "order_status_logs_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
