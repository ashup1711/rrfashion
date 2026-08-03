import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: Record<string, unknown>;

  beforeEach(async () => {
    prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $transaction: jest.fn().mockImplementation((fns: unknown[]) =>
        Promise.all(fns),
      ),
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should use ILIKE for short queries (< 3 chars)', async () => {
      const result = await service.search({ q: 'ab', page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.query).toBe('ab');
      expect(prisma.product.findMany).toHaveBeenCalled();
    });

    it('should use tsvector for queries >= 3 chars', async () => {
      (prisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([]) // results
        .mockResolvedValueOnce([{ total: 0 }]); // count

      const result = await service.search({ q: 'silk lehenga', page: 1, limit: 20 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.query).toBe('silk lehenga');
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    });

    it('should apply category filter in ILIKE search', async () => {
      await service.search({ q: 'ab', page: 1, limit: 20, category: 'cat-123' });

      const whereCall = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
      expect(whereCall.where.categoryId).toBe('cat-123');
    });

    it('should apply inStock filter in ILIKE search', async () => {
      await service.search({ q: 'ab', page: 1, limit: 20, inStock: true });

      const whereCall = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
      expect(whereCall.where.stock).toEqual({ gt: 0 });
    });

    it('should return paginated results', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: '1', name: 'Test', rank: 0 },
      ]);
      (prisma.product.count as jest.Mock).mockResolvedValue(50);

      const result = await service.search({ q: 'ab', page: 2, limit: 10 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics with default values', async () => {
      (prisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ count: 100n }]) // total
        .mockResolvedValueOnce([{ count: 50n }])  // unique
        .mockResolvedValueOnce([{ count: 10n }])  // zero result
        .mockResolvedValueOnce([]) // top queries
        .mockResolvedValueOnce([]); // zero result queries

      const result = await service.getAnalytics({});

      expect(result.totalSearches).toBe(100);
      expect(result.uniqueQueries).toBe(50);
      expect(result.zeroResultSearches).toBe(10);
      expect(result.zeroResultRate).toBe(0.1);
    });

    it('should apply date filters', async () => {
      (prisma.$queryRawUnsafe as jest.Mock)
        .mockResolvedValueOnce([{ count: 0n }])
        .mockResolvedValueOnce([{ count: 0n }])
        .mockResolvedValueOnce([{ count: 0n }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.getAnalytics({ from: '2026-01-01', to: '2026-01-31' });

      const firstCall = (prisma.$queryRawUnsafe as jest.Mock).mock.calls[0];
      expect(firstCall[0]).toContain("createdAt >= '2026-01-01'");
    });
  });
});
