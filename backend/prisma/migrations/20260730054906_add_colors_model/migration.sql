-- CreateTable
CREATE TABLE "colors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "colors_is_active_sort_order_idx" ON "colors"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "product_images_storage_key_idx" ON "product_images"("storage_key");

-- RenameIndex
ALTER INDEX "guest_sessions_expires_at_last_activity_at_idx" RENAME TO "guest_sessions_expiresAt_lastActivityAt_idx";

-- RenameIndex
ALTER INDEX "product_images_variant_id_variant_type_idx" RENAME TO "product_images_variantId_variant_type_idx";
