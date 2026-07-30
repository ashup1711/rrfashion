-- ============================================================================
-- Migration: add_site_reminders
-- Part of: Site Reminders Module
--
-- Purpose:
--   Create the site_reminders table for admin-managed promotional/info banners.
--   These reminders are displayed on the storefront when the current date
--   falls within the start_date to end_date range.
--
-- Changes:
--   1. Create site_reminders table with fields: id, title, message, link_url,
--      start_date, end_date, is_active, created_at, updated_at
--   2. Add composite index on [is_active, start_date, end_date] for efficient
--      active-reminder queries
-- ============================================================================

-- Create site_reminders table
CREATE TABLE "site_reminders" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link_url" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_reminders_pkey" PRIMARY KEY ("id")
);

-- Create composite index for efficient active-reminder queries
CREATE INDEX "site_reminders_is_active_start_date_end_date_idx"
    ON "site_reminders"("is_active", "start_date", "end_date");

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- DROP TABLE IF EXISTS "site_reminders";
