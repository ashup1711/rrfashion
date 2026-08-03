import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';

describe('AnalyticsService (REQ-INS-001)', () => {
  let service: AnalyticsService;

  const mockPrisma = {
    cart: {
      count: jest.fn(),
    },
    rentalBooking: {
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
  };

  const orderRow = {
    order_count: 5,
    revenue: 10000,
    avg_order_value: 2000,
    online_orders: 3,
    offline_orders: 2,
  };

  const mockDashboardCounts = () => {
    mockPrisma.$queryRawUnsafe.mockResolvedValue([orderRow]);
    mockPrisma.rentalBooking.count.mockResolvedValue(2);
    mockPrisma.user.count.mockResolvedValue(100);
    mockPrisma.product.count.mockResolvedValue(50);
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard()', () => {
    it('adds abandonedCarts metric alongside the existing dashboard shape (happy path)', async () => {
      mockDashboardCounts();
      // abandoned = 10, recovered = 4 → recoveryRate = 40%
      mockPrisma.cart.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);

      const result = await service.dashboard('month');

      // New REQ-INS-001 field
      expect(result.abandonedCarts).toEqual({
        abandoned: 10,
        recovered: 4,
        recoveryRate: 40,
      });

      // Existing dashboard shape preserved (nothing replaced)
      expect(result.totalRevenue).toBe(10000);
      expect(result.totalOrders).toBe(5);
      expect(result.averageOrderValue).toBe(2000);
      expect(result.totalCustomers).toBe(100);
      expect(result.totalProducts).toBe(50);
      expect(result.activeRentals).toBe(2);
      expect(typeof result.revenueGrowth).toBe('number');
      expect(typeof result.ordersGrowth).toBe('number');
    });

    it('returns recoveryRate 0 when no carts are abandoned (division by zero)', async () => {
      mockDashboardCounts();
      mockPrisma.cart.count.mockResolvedValue(0);

      const result = await service.dashboard('day');

      expect(result.abandonedCarts).toEqual({
        abandoned: 0,
        recovered: 0,
        recoveryRate: 0,
      });
    });

    it('rounds recoveryRate to 1 decimal place', async () => {
      mockDashboardCounts();
      // 1 recovered out of 3 abandoned = 33.333...% → 33.3
      mockPrisma.cart.count.mockResolvedValueOnce(3).mockResolvedValueOnce(1);

      const result = await service.dashboard('week');

      expect(result.abandonedCarts.recoveryRate).toBe(33.3);
    });

    it('returns recoveryRate 100 when every abandoned cart was recovered', async () => {
      mockDashboardCounts();
      mockPrisma.cart.count.mockResolvedValueOnce(7).mockResolvedValueOnce(7);

      const result = await service.dashboard('month');

      expect(result.abandonedCarts).toEqual({
        abandoned: 7,
        recovered: 7,
        recoveryRate: 100,
      });
    });

    it('counts recovered only when both recoveredAt AND abandonedAt are set', async () => {
      mockDashboardCounts();
      mockPrisma.cart.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);

      await service.dashboard('year');

      // abandoned query: only abandonedAt filter
      expect(mockPrisma.cart.count).toHaveBeenNthCalledWith(1, {
        where: { abandonedAt: { not: null } },
      });

      // recovered query: both filters — a cart with recoveredAt but no
      // abandonedAt must NOT be counted as recovered
      expect(mockPrisma.cart.count).toHaveBeenNthCalledWith(2, {
        where: { recoveredAt: { not: null }, abandonedAt: { not: null } },
      });
    });
  });

  // SEC-14: admin insights/export responses must never be cached by a browser
  // or shared proxy. /api/admin/* is outside the global noStoreMiddleware
  // allow-list, so each handler sets the header explicitly.
  describe('SEC-14 cache headers', () => {
    it.each(['dashboard', 'revenueChart', 'topProducts', 'export'])(
      'sets Cache-Control: no-store on %s',
      (handler) => {
        const headers = Reflect.getMetadata(
          '__headers__',
          (AnalyticsController.prototype as unknown as Record<string, object>)[handler],
        ) as Array<{ name: string; value: string }> | undefined;

        expect(headers).toEqual(
          expect.arrayContaining([{ name: 'Cache-Control', value: 'no-store' }]),
        );
      },
    );
  });
});
