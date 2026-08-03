-- ============================================================================
-- Migration: phase2_search_query
-- Phase 2 — Search analytics log (request_id 665a793e0011)
--
-- Implements REQ-BE-018: a durable log of every client search query so the
-- admin analytics endpoint can report popular queries and zero-result queries.
--
-- Generated with `prisma migrate diff --from-url <live> --to-schema-datamodel`
-- (the db-expert's workaround for the pre-existing P3006 shadow-DB issue that
-- blocks `prisma migrate dev`). Applied with `prisma migrate deploy`.
--
-- Safety: 100% additive. No existing table/column is touched.
-- ============================================================================

-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "text" VARCHAR(256) NOT NULL,
    "normalized" VARCHAR(256) NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "search_queries_createdAt_idx" ON "search_queries"("createdAt");

-- CreateIndex
CREATE INDEX "search_queries_normalized_createdAt_idx" ON "search_queries"("normalized", "createdAt");

-- Rollback (apply only to revert this migration):
-- DROP TABLE "search_queries";
