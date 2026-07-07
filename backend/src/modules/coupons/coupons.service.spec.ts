import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { PrismaService } from '../../prisma/prisma.service';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: typeof mockPrisma;

  const mockPrisma = {
    coupon: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    couponUsage: {
      count: jest.fn(),
    },
    cartItem: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = {
      code: 'SAVE10',
      type: 'PERCENT' as const,
      value: 10,
      validFrom: '2025-01-01T00:00:00Z',
      validUntil: '2026-12-31T00:00:00Z',
    };

    it('creates a coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue({ id: '1', ...dto, code: 'SAVE10' });

      const result = await service.create(dto as CreateCouponDto);
      expect(result.code).toBe('SAVE10');
      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ code: 'SAVE10' }),
        }),
      );
    });

    it('throws on duplicate code', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.create(dto as CreateCouponDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns all coupons', async () => {
      prisma.coupon.findMany.mockResolvedValue([{ id: '1', code: 'SAVE10' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('returns coupon by id', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ id: '1', code: 'SAVE10' });
      const result = await service.findById('1');
      expect(result).toBeDefined();
    });

    it('throws on not found', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('apply', () => {
    const coupon = {
      id: 'c1',
      code: 'SAVE10',
      type: 'PERCENT',
      value: { toNumber: () => 10 },
      minCartValue: { toNumber: () => 0 },
      maxDiscount: { toNumber: () => 100 },
      appliesTo: 'ALL',
      isActive: true,
      validFrom: new Date('2025-01-01'),
      validUntil: new Date('2026-12-31'),
      usageLimit: 100,
      usedCount: 5,
      perUserLimit: 1,
    };

    it('applies valid coupon and calculates discount', async () => {
      prisma.coupon.findUnique.mockResolvedValue(coupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'ci1',
          type: 'buy',
          quantity: 1,
          variant: { salePrice: { toNumber: () => 1000 }, rentPricePerDay: null },
        },
      ]);

      const result = await service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] });
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(100);
    });

    it('rejects invalid code', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(
        service.apply({ code: 'INVALID', userId: 'u1', cartItemIds: ['ci1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...coupon, isActive: false });
      prisma.couponUsage.count.mockResolvedValue(0);
      await expect(
        service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects expired coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...coupon, validUntil: new Date('2020-01-01') });
      prisma.couponUsage.count.mockResolvedValue(0);
      await expect(
        service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when usage limit reached', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...coupon, usageLimit: 5, usedCount: 5 });
      prisma.couponUsage.count.mockResolvedValue(0);
      await expect(
        service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when per-user limit reached', async () => {
      prisma.coupon.findUnique.mockResolvedValue(coupon);
      prisma.couponUsage.count.mockResolvedValue(1);
      await expect(
        service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects empty cart', async () => {
      prisma.coupon.findUnique.mockResolvedValue(coupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.cartItem.findMany.mockResolvedValue([]);
      await expect(
        service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies flat discount correctly', async () => {
      const flatCoupon = { ...coupon, type: 'FLAT', value: { toNumber: () => 50 } };
      prisma.coupon.findUnique.mockResolvedValue(flatCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'ci1',
          type: 'buy',
          quantity: 1,
          variant: { salePrice: { toNumber: () => 1000 }, rentPricePerDay: null },
        },
      ]);

      const result = await service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] });
      expect(result.discount).toBe(50);
    });

    it('caps discount at maxDiscount', async () => {
      const cappedCoupon = {
        ...coupon,
        value: { toNumber: () => 50 },
        maxDiscount: { toNumber: () => 20 },
      };
      prisma.coupon.findUnique.mockResolvedValue(cappedCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 'ci1',
          type: 'buy',
          quantity: 1,
          variant: { salePrice: { toNumber: () => 1000 }, rentPricePerDay: null },
        },
      ]);

      const result = await service.apply({ code: 'SAVE10', userId: 'u1', cartItemIds: ['ci1'] });
      expect(result.discount).toBe(20);
    });
  });
});
