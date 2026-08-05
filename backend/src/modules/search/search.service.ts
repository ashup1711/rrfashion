import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQueryDto, SearchResponseDto } from './dto/search-query.dto';
import { SearchAnalyticsQueryDto, SearchAnalyticsResult } from './dto/search-analytics-query.dto';

/** Minimum query length for tsvector full-text search. */
const TSVECTOR_MIN_LENGTH = 3;

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * REQ-BE-008: Full-text product search.
   *
   * Strategy:
   *  1. For queries >= 3 chars use PostgreSQL tsvector + ts_rank for
   *     relevance-based results via raw SQL.
   *  2. For shorter queries fall back to Prisma ILIKE on name/description.
   *  3. Best-effort search analytics are written to the search_logs table
   *     (inserted via raw SQL so the code works even if the table does not
   *     exist yet — the error is silently swallowed).
   */
  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const { q, page = 1, limit = 20, category, inStock } = query;
    const skip = (page - 1) * limit;

    void this.logSearchAnalytics(q);

    if (q.length >= TSVECTOR_MIN_LENGTH) {
      return this.fullTextSearch(q, page, limit, skip, category, inStock);
    }

    return this.ilikeSearch(q, page, limit, skip, category, inStock);
  }

  /**
   * REQ-BE-014: Search analytics — popular queries, zero-result queries,
   * total searches, etc. Admin-only endpoint.
   */
  async getAnalytics(dto: SearchAnalyticsQueryDto): Promise<SearchAnalyticsResult> {
    const { from, to, top = 20 } = dto;

    const { clause: whereClause, params: whereParams } = this.buildAnalyticsWhereClause(from, to);

    const [totalRow, uniqueRow, zeroResultRow, topQueries, zeroResultQueries] = await Promise.all([
      this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM search_logs${whereClause}`,
        ...whereParams,
      ),
      this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(DISTINCT query)::bigint AS count FROM search_logs${whereClause}`,
        ...whereParams,
      ),
      this.prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM search_logs${whereClause} AND result_count = 0`,
        ...whereParams,
      ),
      this.prisma.$queryRawUnsafe<Array<{ query: string; count: bigint; avg_results: number }>>(
        `SELECT query, COUNT(*)::bigint AS count, COALESCE(AVG(result_count), 0)::float AS avg_results
           FROM search_logs${whereClause}
           GROUP BY query ORDER BY count DESC LIMIT $${whereParams.length + 1}`,
        ...whereParams,
        top,
      ),
      this.prisma.$queryRawUnsafe<Array<{ query: string; count: bigint }>>(
        `SELECT query, COUNT(*)::bigint AS count
           FROM search_logs${whereClause} AND result_count = 0
           GROUP BY query ORDER BY count DESC LIMIT $${whereParams.length + 1}`,
        ...whereParams,
        top,
      ),
    ]);

    const totalSearches = totalRow[0] ? Number(totalRow[0].count) : 0;
    const uniqueQueries = uniqueRow[0] ? Number(uniqueRow[0].count) : 0;
    const zeroResultSearches = zeroResultRow[0] ? Number(zeroResultRow[0].count) : 0;

    return {
      totalSearches,
      uniqueQueries,
      zeroResultSearches,
      zeroResultRate: totalSearches > 0 ? zeroResultSearches / totalSearches : 0,
      topQueries: topQueries.map((r) => ({
        query: r.query,
        count: Number(r.count),
        avgResults: Number(r.avg_results),
      })),
      zeroResultQueries: zeroResultQueries.map((r) => ({
        query: r.query,
        count: Number(r.count),
      })),
      from: from ?? null,
      to: to ?? null,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async fullTextSearch(
    q: string,
    page: number,
    limit: number,
    skip: number,
    category?: string,
    inStock?: boolean,
  ): Promise<SearchResponseDto> {
    const tsQuery = q
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `${t}:*`)
      .join(' & ');

    const conditions: string[] = [];
    const params: unknown[] = [q]; // $1 = search query
    let paramIndex = 2;

    if (category) {
      conditions.push(`p."categoryId" = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (inStock) {
      conditions.push('p.stock > 0');
    }

    const whereExtra = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const results = await this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT p.id, p.name, p.slug, p.description, p."basePrice", p."salePrice",
              p.images, p.stock, p."isRentable", p."isSellable", p."categoryId", p."brandId",
              ts_rank(p."searchVector", websearch_to_tsquery('english', $1)) AS rank
       FROM products p
       WHERE p."searchVector" @@ websearch_to_tsquery('english', $1)
         AND p."isActive" = true AND p."deletedAt" IS NULL
         ${whereExtra}
       ORDER BY rank DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      ...params,
      limit,
      skip,
    );

    const countResult = await this.prisma.$queryRawUnsafe<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total
       FROM products p
       WHERE p."searchVector" @@ websearch_to_tsquery('english', $1)
         AND p."isActive" = true AND p."deletedAt" IS NULL
         ${whereExtra}`,
      ...params,
    );

    this.updateSearchResultCount(q, countResult[0]?.total ?? 0).catch(() => {
      /* best-effort */
    });

    return {
      items: results as unknown as SearchResponseDto['items'],
      total: countResult[0]?.total ?? 0,
      page,
      limit,
      query: q,
    };
  }

  private async ilikeSearch(
    q: string,
    page: number,
    limit: number,
    skip: number,
    category?: string,
    inStock?: boolean,
  ): Promise<SearchResponseDto> {
    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
      isActive: true,
      deletedAt: null,
      ...(category ? { categoryId: category } : {}),
      ...(inStock ? { stock: { gt: 0 } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          basePrice: true,
          salePrice: true,
          images: true,
          stock: true,
          isRentable: true,
          isSellable: true,
          categoryId: true,
          brandId: true,
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    this.updateSearchResultCount(q, total).catch(() => {
      /* best-effort */
    });

    return {
      items: items.map((p) => ({
        ...p,
        basePrice: Number(p.basePrice),
        salePrice: p.salePrice != null ? Number(p.salePrice) : null,
        rank: 0,
      })),
      total,
      page,
      limit,
      query: q,
    };
  }

  /**
   * Best-effort search analytics write. Uses raw SQL so it works even if
   * the search_logs table has not been created yet.
   */
  private logSearchAnalytics(query: string): Promise<void> {
    return this.prisma
      .$executeRawUnsafe(`INSERT INTO search_logs (query, "createdAt") VALUES ($1, NOW())`, query)
      .then(() => undefined)
      .catch(() => undefined);
  }

  /**
   * Best-effort update of result_count on the most recent search_log row
   * for this query. Uses WHERE result_count IS NULL guard to prevent
   * concurrent updates from overwriting an already-set value.
   */
  private updateSearchResultCount(query: string, resultCount: number): Promise<void> {
    return this.prisma
      .$executeRawUnsafe(
        `UPDATE search_logs SET result_count = $2
         WHERE id = (
           SELECT id FROM search_logs WHERE query = $1 AND result_count IS NULL
           ORDER BY "createdAt" DESC LIMIT 1
         )`,
        query,
        resultCount,
      )
      .then(() => undefined)
      .catch(() => undefined);
  }

  private buildAnalyticsWhereClause(
    from?: string,
    to?: string,
  ): { clause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (from) {
      conditions.push(`"createdAt" >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }
    if (to) {
      conditions.push(`"createdAt" <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }

    return {
      clause: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '',
      params,
    };
  }
}
