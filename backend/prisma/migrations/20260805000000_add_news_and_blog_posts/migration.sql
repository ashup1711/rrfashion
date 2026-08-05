-- ============================================================================
-- Migration: add_news_and_blog_posts
-- REQ-DB-001: News model for admin-managed news/announcement items
-- REQ-DB-002: BlogPost model for admin-managed blog content
--
-- Adds two new tables: news and blog_posts. Both support admin CRUD
-- operations and public read endpoints. The news table supports
-- time-based scheduling (start_date/end_date) and ordering (sort_order).
-- The blog_posts table supports publishing workflow (is_published,
-- published_at) and SEO-friendly slugs.
--
-- PostgreSQL-specific features used:
--   - String[] array type for blog_post.tags
--   - VarChar length constraints on title/excerpt/category fields
--
-- Rollback: DROP TABLE IF EXISTS "blog_posts"; DROP TABLE IF EXISTS "news";
-- ============================================================================

-- CreateTable: news
CREATE TABLE "news" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "content" TEXT,
    "image_url" TEXT,
    "link_url" TEXT,
    "link_text" VARCHAR(100),
    "category" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_pkey" PRIMARY KEY ("id")
);

-- CreateTable: blog_posts
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "category" VARCHAR(64),
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "author" VARCHAR(128),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: news composite index for public active query
CREATE INDEX "news_is_active_start_date_end_date_idx" ON "news"("is_active", "start_date", "end_date");

-- CreateIndex: news sort_order index for ordering
CREATE INDEX "news_sort_order_idx" ON "news"("sort_order");

-- CreateIndex: news category index for filtering
CREATE INDEX "news_category_idx" ON "news"("category");

-- CreateIndex: blog_posts composite index for public listing query
CREATE INDEX "blog_posts_is_published_published_at_idx" ON "blog_posts"("is_published", "published_at");

-- CreateIndex: blog_posts category index for filtering
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");

-- CreateIndex: blog_posts unique slug index
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
