-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RETAIL', 'SERVICES', 'MANUFACTURING', 'RESTAURANT', 'RENTAL');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'STAFF');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "colors" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "coupon_usages" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "courier_receipts" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "guest_addresses" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "guest_cart_items" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "guest_sessions" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "guest_wishlist_items" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "inquiries" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "inventory_locks" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "inventory_reconciliation_logs" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "inventory_summary" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "inventory_units" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "invoice_sequences" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "news" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "order_status_logs" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "pos_devices" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "product_tags" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "rental_bookings" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "rental_extensions" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "reports_exports" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "return_policies" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "return_request_items" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "return_requests" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "search_queries" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "shipping_addresses" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "site_reminders" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "size_guides" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "sizes" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "stock_audits" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "store_locations" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "user_addresses" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- AlterTable
ALTER TABLE "wishlists" ADD COLUMN     "tenantId" TEXT NOT NULL DEFAULT COALESCE(NULLIF(current_setting('app.current_tenant_id', true), ''), '00000000-0000-4000-8000-000000000001');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "slug" TEXT NOT NULL,
    "businessType" "BusinessType" NOT NULL,
    "gstin" VARCHAR(15),
    "pan" VARCHAR(10),
    "tan" VARCHAR(10),
    "cin" VARCHAR(21),
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "trialEndsAt" TIMESTAMP(3),
    "ownerAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'STAFF',
    "invitedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_slug_status_idx" ON "tenants"("slug", "status");

-- CreateIndex
CREATE INDEX "tenant_memberships_adminUserId_idx" ON "tenant_memberships"("adminUserId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_memberships_tenantId_adminUserId_key" ON "tenant_memberships"("tenantId", "adminUserId");

-- CreateIndex
CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");

-- CreateIndex
CREATE INDEX "blog_posts_tenantId_idx" ON "blog_posts"("tenantId");

-- CreateIndex
CREATE INDEX "brands_tenantId_idx" ON "brands"("tenantId");

-- CreateIndex
CREATE INDEX "cart_items_tenantId_idx" ON "cart_items"("tenantId");

-- CreateIndex
CREATE INDEX "carts_tenantId_idx" ON "carts"("tenantId");

-- CreateIndex
CREATE INDEX "categories_tenantId_idx" ON "categories"("tenantId");

-- CreateIndex
CREATE INDEX "colors_tenantId_idx" ON "colors"("tenantId");

-- CreateIndex
CREATE INDEX "coupon_usages_tenantId_idx" ON "coupon_usages"("tenantId");

-- CreateIndex
CREATE INDEX "coupons_tenantId_idx" ON "coupons"("tenantId");

-- CreateIndex
CREATE INDEX "courier_receipts_tenantId_idx" ON "courier_receipts"("tenantId");

-- CreateIndex
CREATE INDEX "guest_addresses_tenantId_idx" ON "guest_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "guest_cart_items_tenantId_idx" ON "guest_cart_items"("tenantId");

-- CreateIndex
CREATE INDEX "guest_sessions_tenantId_idx" ON "guest_sessions"("tenantId");

-- CreateIndex
CREATE INDEX "guest_wishlist_items_tenantId_idx" ON "guest_wishlist_items"("tenantId");

-- CreateIndex
CREATE INDEX "inquiries_tenantId_idx" ON "inquiries"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_locks_tenantId_idx" ON "inventory_locks"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_reconciliation_logs_tenantId_idx" ON "inventory_reconciliation_logs"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_summary_tenantId_idx" ON "inventory_summary"("tenantId");

-- CreateIndex
CREATE INDEX "inventory_units_tenantId_idx" ON "inventory_units"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_sequences_tenantId_idx" ON "invoice_sequences"("tenantId");

-- CreateIndex
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");

-- CreateIndex
CREATE INDEX "news_tenantId_idx" ON "news"("tenantId");

-- CreateIndex
CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");

-- CreateIndex
CREATE INDEX "order_items_tenantId_idx" ON "order_items"("tenantId");

-- CreateIndex
CREATE INDEX "order_status_logs_tenantId_idx" ON "order_status_logs"("tenantId");

-- CreateIndex
CREATE INDEX "orders_tenantId_idx" ON "orders"("tenantId");

-- CreateIndex
CREATE INDEX "payments_tenantId_idx" ON "payments"("tenantId");

-- CreateIndex
CREATE INDEX "pos_devices_tenantId_idx" ON "pos_devices"("tenantId");

-- CreateIndex
CREATE INDEX "product_images_tenantId_idx" ON "product_images"("tenantId");

-- CreateIndex
CREATE INDEX "product_tags_tenantId_idx" ON "product_tags"("tenantId");

-- CreateIndex
CREATE INDEX "product_variants_tenantId_idx" ON "product_variants"("tenantId");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE INDEX "refunds_tenantId_idx" ON "refunds"("tenantId");

-- CreateIndex
CREATE INDEX "rental_bookings_tenantId_idx" ON "rental_bookings"("tenantId");

-- CreateIndex
CREATE INDEX "rental_extensions_tenantId_idx" ON "rental_extensions"("tenantId");

-- CreateIndex
CREATE INDEX "reports_exports_tenantId_idx" ON "reports_exports"("tenantId");

-- CreateIndex
CREATE INDEX "return_policies_tenantId_idx" ON "return_policies"("tenantId");

-- CreateIndex
CREATE INDEX "return_request_items_tenantId_idx" ON "return_request_items"("tenantId");

-- CreateIndex
CREATE INDEX "return_requests_tenantId_idx" ON "return_requests"("tenantId");

-- CreateIndex
CREATE INDEX "reviews_tenantId_idx" ON "reviews"("tenantId");

-- CreateIndex
CREATE INDEX "search_queries_tenantId_idx" ON "search_queries"("tenantId");

-- CreateIndex
CREATE INDEX "shipping_addresses_tenantId_idx" ON "shipping_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "site_reminders_tenantId_idx" ON "site_reminders"("tenantId");

-- CreateIndex
CREATE INDEX "size_guides_tenantId_idx" ON "size_guides"("tenantId");

-- CreateIndex
CREATE INDEX "sizes_tenantId_idx" ON "sizes"("tenantId");

-- CreateIndex
CREATE INDEX "stock_audits_tenantId_idx" ON "stock_audits"("tenantId");

-- CreateIndex
CREATE INDEX "stock_movements_tenantId_idx" ON "stock_movements"("tenantId");

-- CreateIndex
CREATE INDEX "store_locations_tenantId_idx" ON "store_locations"("tenantId");

-- CreateIndex
CREATE INDEX "user_addresses_tenantId_idx" ON "user_addresses"("tenantId");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "wallet_transactions_tenantId_idx" ON "wallet_transactions"("tenantId");

-- CreateIndex
CREATE INDEX "wishlists_tenantId_idx" ON "wishlists"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ─── Backfill: RR Fashion becomes tenant #1 ───────────────────────────
-- Existing rows already received tenant #1 via the column default above.
INSERT INTO "tenants" ("id", "name", "legalName", "slug", "businessType", "status", "plan", "ownerAdminId", "createdAt", "updatedAt")
VALUES (
  '00000000-0000-4000-8000-000000000001', 'RR Fashion', 'RR Fashion', 'rr-fashion', 'RETAIL', 'ACTIVE', 'ENTERPRISE',
  (SELECT a."id" FROM "admin_users" a JOIN "roles" r ON r."id" = a."roleId"
    WHERE r."isSystem" = true AND a."deletedAt" IS NULL ORDER BY a."createdAt" ASC LIMIT 1),
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "tenant_memberships" ("id", "tenantId", "adminUserId", "role", "acceptedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '00000000-0000-4000-8000-000000000001', a."id",
  CASE WHEN r."isSystem" = true THEN 'OWNER'::"TenantRole" ELSE 'ADMIN'::"TenantRole" END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "admin_users" a
LEFT JOIN "roles" r ON r."id" = a."roleId"
WHERE a."deletedAt" IS NULL
ON CONFLICT ("tenantId", "adminUserId") DO NOTHING;

-- ─── Row-level security ───────────────────────────────────────────────
-- When app.current_tenant_id is set (transaction-local, see PrismaService), only that
-- tenant's rows are visible/writable. When unset (migrations, system jobs) rows are
-- not filtered; the application-layer Prisma middleware still scopes request queries.
-- Superusers and BYPASSRLS roles always bypass RLS, so production must connect as a
-- regular role for this layer to take effect.
CREATE OR REPLACE FUNCTION app_tenant_visible(row_tenant_id text) RETURNS boolean
  LANGUAGE sql STABLE AS $fn$
    SELECT NULLIF(current_setting('app.current_tenant_id', true), '') IS NULL
        OR row_tenant_id = current_setting('app.current_tenant_id', true)
  $fn$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'user_addresses', 'categories', 'brands', 'products', 'product_variants', 'product_images', 'product_tags', 'size_guides', 'reviews', 'store_locations', 'orders', 'order_status_logs', 'order_items', 'carts', 'cart_items', 'shipping_addresses', 'courier_receipts', 'inventory_units', 'inventory_summary', 'inventory_locks', 'stock_movements', 'payments', 'rental_bookings', 'rental_extensions', 'invoice_sequences', 'invoices', 'audit_logs', 'search_queries', 'wishlists', 'guest_sessions', 'guest_cart_items', 'guest_wishlist_items', 'guest_addresses', 'notifications', 'inquiries', 'coupons', 'coupon_usages', 'pos_devices', 'wallet_transactions', 'stock_audits', 'return_policies', 'reports_exports', 'site_reminders', 'news', 'blog_posts', 'colors', 'sizes', 'return_requests', 'return_request_items', 'refunds', 'inventory_reconciliation_logs']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (app_tenant_visible("tenantId")) WITH CHECK (app_tenant_visible("tenantId"))',
      t
    );
  END LOOP;
END $$;
