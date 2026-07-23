-- DropIndex
DROP INDEX "reviews_order_item_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_productId_key" ON "reviews"("userId", "productId");
