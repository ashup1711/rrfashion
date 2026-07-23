import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('ProductsService', () => {
  let service: ProductsService;

  const productFindMany = jest.fn();
  const productCount = jest.fn();
  const categoryFindMany = jest.fn();
  const productGroupBy = jest.fn();

  const mockPrisma = {
    product: {
      findMany: productFindMany,
      count: productCount,
      groupBy: productGroupBy,
      findUnique: jest.fn(),
    },
    category: {
      findMany: categoryFindMany,
    },
    productVariant: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const mockGateway = {
    notifyProductUpdate: jest.fn(),
    sendSaleAlert: jest.fn(),
  } as unknown as NotificationsGateway;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();
    service = module.get<ProductsService>(ProductsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    productFindMany.mockResolvedValue([]);
    productCount.mockResolvedValue(0);
    categoryFindMany.mockResolvedValue([]);
    productGroupBy.mockResolvedValue([]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll - onSale filter', () => {
    it('filters for on sale (salePrice not null) when onSale=true', async () => {
      await service.findAll({ onSale: true });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.salePrice).toEqual({ not: null });
    });

    it('filters salePrice null when onSale=false', async () => {
      await service.findAll({ onSale: false });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.salePrice).toBeNull();
    });

    it('preserves the price range when onSale=true is combined with minPrice/maxPrice', async () => {
      await service.findAll({ onSale: true, minPrice: 100, maxPrice: 500 });

      const where = productFindMany.mock.calls[0][0].where;
      // The price range already excludes null salePrices, so `not: null` is omitted.
      expect(where.salePrice).toEqual({ gte: 100, lte: 500 });
    });

    it('still applies the price range when onSale is undefined', async () => {
      await service.findAll({ minPrice: 100, maxPrice: 500 });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.salePrice).toEqual({ gte: 100, lte: 500 });
    });
  });

  describe('findAll - stock availability filter', () => {
    it('filters stock gt 0 when inStock=true', async () => {
      await service.findAll({ inStock: true });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.stock).toEqual({ gt: 0 });
    });

    it('filters stock equals 0 when outOfStock=true', async () => {
      await service.findAll({ outOfStock: true });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.stock).toEqual({ equals: 0 });
    });

    it('applies no stock filter when both inStock and outOfStock are true', async () => {
      await service.findAll({ inStock: true, outOfStock: true });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.stock).toBeUndefined();
    });

    it('applies no stock filter when both are false', async () => {
      await service.findAll({ inStock: false, outOfStock: false });

      const where = productFindMany.mock.calls[0][0].where;
      expect(where.stock).toBeUndefined();
    });
  });

  describe('getProductCounts', () => {
    it('returns category, brand, inStock and outOfStock counts', async () => {
      categoryFindMany.mockResolvedValue([
        { id: 'cat-1', name: 'Shirts' },
        { id: 'cat-2', name: 'Pants' },
      ]);
      productCount
        .mockResolvedValueOnce(3) // category cat-1
        .mockResolvedValueOnce(5) // category cat-2
        .mockResolvedValueOnce(8) // inStock
        .mockResolvedValueOnce(2); // outOfStock
      productGroupBy.mockResolvedValue([
        { brandId: 'brand-1', _count: { _all: 4 } },
        { brandId: 'brand-2', _count: { _all: 6 } },
      ]);

      const result = await service.getProductCounts();

      expect(result.categories).toEqual({ 'cat-1': 3, 'cat-2': 5 });
      expect(result.brands).toEqual({ 'brand-1': 4, 'brand-2': 6 });
      expect(result.inStock).toBe(8);
      expect(result.outOfStock).toBe(2);
    });

    it('omits brand rows with a null brandId', async () => {
      categoryFindMany.mockResolvedValue([]);
      productCount.mockResolvedValue(0);
      productGroupBy.mockResolvedValue([{ brandId: null, _count: { _all: 9 } }]);

      const result = await service.getProductCounts();

      expect(result.brands).toEqual({});
    });
  });

  describe('getVariantSpecsForCart', () => {
    const productFindUnique = jest.fn();
    const productVariantFindMany = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
      (mockPrisma as any).product = { findUnique: productFindUnique };
      (mockPrisma as any).productVariant = { findMany: productVariantFindMany };
    });

    it('should return product variant specs with stock levels', async () => {
      productFindUnique.mockResolvedValue({ id: 'product-1', name: 'Test Product' });
      productVariantFindMany.mockResolvedValue([
        {
          id: 'variant-1',
          size: 'M',
          color: 'Red',
          sku: 'SKU-001',
          salePrice: 1499,
          inventorySummaries: [
            { quantityAvailable: 10, storeId: 'store-1' },
            { quantityAvailable: 5, storeId: 'store-2' },
          ],
        },
        {
          id: 'variant-2',
          size: 'L',
          color: 'Red',
          sku: 'SKU-002',
          salePrice: 1499,
          inventorySummaries: [
            { quantityAvailable: 3, storeId: 'store-1' },
          ],
        },
        {
          id: 'variant-3',
          size: 'XL',
          color: 'Red',
          sku: 'SKU-003',
          salePrice: null, // No sale price
          inventorySummaries: [],
        },
      ]);

      const result = await service.getVariantSpecsForCart('product-1');

      expect(productFindUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        select: { id: true, name: true },
      });

      expect(result.productId).toBe('product-1');
      expect(result.variants).toHaveLength(3);

      // Check first variant (M size)
      expect(result.variants[0]).toEqual({
        id: 'variant-1',
        size: 'M',
        color: 'Red',
        salePrice: 1499,
        stock: 15,
        isAvailable: true,
        sku: 'SKU-001',
      });

      // Check second variant (L size)
      expect(result.variants[1]).toEqual({
        id: 'variant-2',
        size: 'L',
        color: 'Red',
        salePrice: 1499,
        stock: 3,
        isAvailable: true,
        sku: 'SKU-002',
      });

      // Check third variant (XL size - out of stock)
      expect(result.variants[2]).toEqual({
        id: 'variant-3',
        size: 'XL',
        color: 'Red',
        salePrice: undefined,
        stock: 0,
        isAvailable: false,
        sku: 'SKU-003',
      });
    });

    it('should throw NotFoundException if product does not exist', async () => {
      productFindUnique.mockResolvedValue(null);

      await expect(service.getVariantSpecsForCart('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter out inactive variants', async () => {
      productFindUnique.mockResolvedValue({ id: 'product-1', name: 'Test Product' });
      productVariantFindMany.mockResolvedValue([
        {
          id: 'variant-1',
          size: 'M',
          color: 'Red',
          sku: 'SKU-001',
          salePrice: 1499,
          inventorySummaries: [{ quantityAvailable: 10, storeId: 'store-1' }],
        },
      ]);

      const result = await service.getVariantSpecsForCart('product-1');

      expect(result.variants).toHaveLength(1);
      expect(result.variants[0].isAvailable).toBe(true);
    });

    it('should return empty array when product has no variants', async () => {
      productFindUnique.mockResolvedValue({ id: 'product-1', name: 'Test Product' });
      productVariantFindMany.mockResolvedValue([]);

      const result = await service.getVariantSpecsForCart('product-1');

      expect(result.variants).toEqual([]);
    });
  });
});
