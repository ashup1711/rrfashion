-- ============================================================================
-- Migration: guest_session_tables
-- Phase 1 of guest user common-table refactor
--
-- Purpose:
--   Convert the guest user pattern from a User-row-with-isGuest-flag to a
--   dedicated `guest_sessions` common table that holds cart/wishlist data for
--   unauthenticated visitors. This decouples guest data from the User table
--   entirely, simplifying auth, GDPR, and cleanup.
--
-- Tables created:
--   - guest_sessions        : one row per guest browser session
--   - guest_cart_items      : cart items belonging to a guest session
--   - guest_wishlist_items  : wishlist items belonging to a guest session
--
-- Data migration:
--   - Hard-delete all existing guest users (isGuest = true). CASCADE on
--     User -> Cart, Wishlist, RefreshToken, Notification will clean up the
--     downstream rows. This is a hard cutover per the design decision:
--     there is no in-flight guest state worth preserving.
-- ============================================================================

-- 1. Create new tables
CREATE TABLE "guest_sessions" (
  "id" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "guest_sessions_expiresAt_idx" ON "guest_sessions"("expiresAt");
CREATE INDEX "guest_sessions_lastActivityAt_idx" ON "guest_sessions"("lastActivityAt");

CREATE TABLE "guest_cart_items" (
  "id" TEXT NOT NULL,
  "guest_session_id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "type" TEXT NOT NULL DEFAULT 'sale',
  "rentStart" TIMESTAMP(3),
  "rentEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "guest_cart_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "guest_cart_items_guestSessionId_variantId_type_key" ON "guest_cart_items"("guest_session_id", "variantId", "type");
CREATE INDEX "guest_cart_items_guest_session_id_idx" ON "guest_cart_items"("guest_session_id");

CREATE TABLE "guest_wishlist_items" (
  "id" TEXT NOT NULL,
  "guest_session_id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "notifyOnRestock" BOOLEAN NOT NULL DEFAULT false,
  "notifyOnPriceDrop" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guest_wishlist_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "guest_wishlist_items_guestSessionId_variantId_key" ON "guest_wishlist_items"("guest_session_id", "variantId");
CREATE INDEX "guest_wishlist_items_guest_session_id_idx" ON "guest_wishlist_items"("guest_session_id");

-- 2. Add foreign keys
ALTER TABLE "guest_cart_items" ADD CONSTRAINT "guest_cart_items_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guest_cart_items" ADD CONSTRAINT "guest_cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "guest_cart_items" ADD CONSTRAINT "guest_cart_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "guest_wishlist_items" ADD CONSTRAINT "guest_wishlist_items_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guest_wishlist_items" ADD CONSTRAINT "guest_wishlist_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Data migration: hard-delete all old guest users.
--    CASCADE drops their cart, wishlist, refresh tokens, and notifications.
--    This is a hard cutover per the user's decision.
DELETE FROM "users" WHERE "isGuest" = true;
