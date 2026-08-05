import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

describe('ProductsService — Bulk Operations', () => {
  let service: ProductsService;
  let prisma: Record<string, unknown>;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'new-1', name: 'Test' }),
        update: jest.fn().mockResolvedValue({ id: 'upd-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      category: {
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Sarees' }),
      },
      $transaction: jest.fn().mockImplementation((fns: unknown[]) => Promise.all(fns)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsGateway, useValue: { notifyUser: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('bulkImport', () => {
    it('should import valid CSV rows', async () => {
      const rows = [
        {
          name: 'Silk Saree',
          basePrice: '2500',
          categoryId: 'cat-1',
          description: 'A beautiful silk saree',
          stock: '10',
        },
      ];

      const result = await service.bulkImport(rows, 'admin-1');

      expect(result.imported).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.total).toBe(1);
      expect(prisma.product.create).toHaveBeenCalled();
    });

    it('should reject rows with missing name', async () => {
      const rows = [
        {
          name: '',
          basePrice: '2500',
          categoryId: 'cat-1',
        },
      ];

      const result = await service.bulkImport(rows, 'admin-1');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('name is required');
    });

    it('should reject rows with invalid basePrice', async () => {
      const rows = [
        {
          name: 'Test Product',
          basePrice: 'invalid',
          categoryId: 'cat-1',
        },
      ];

      const result = await service.bulkImport(rows, 'admin-1');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('basePrice');
    });

    it('should reject rows with missing categoryId', async () => {
      const rows = [
        {
          name: 'Test Product',
          basePrice: '1000',
          categoryId: '',
        },
      ];

      const result = await service.bulkImport(rows, 'admin-1');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('categoryId is required');
    });

    it('should reject rows with non-existent category', async () => {
      (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      const rows = [
        {
          name: 'Test Product',
          basePrice: '1000',
          categoryId: 'nonexistent',
        },
      ];

      const result = await service.bulkImport(rows, 'admin-1');

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not found');
    });

    it('should handle mixed valid and invalid rows', async () => {
      const rows = [
        {
          name: 'Good Product',
          basePrice: '1000',
          categoryId: 'cat-1',
        },
        {
          name: '',
          basePrice: '500',
          categoryId: 'cat-1',
        },
        {
          name: 'Another Good Product',
          basePrice: '2000',
          categoryId: 'cat-1',
        },
      ];

      const result = await service.bulkImport(rows, 'admin-1');

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.total).toBe(3);
    });
  });

  describe('bulkUpdate', () => {
    it('should update existing products', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        name: 'Test',
      });

      const dto = {
        updates: [{ productId: 'prod-1', basePrice: 3000, stock: 50 }],
      };

      const result = await service.bulkUpdate(dto, 'admin-1');

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('should report errors for non-existent products', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

      const dto = {
        updates: [{ productId: 'nonexistent', basePrice: 3000 }],
      };

      const result = await service.bulkUpdate(dto, 'admin-1');

      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Product not found');
    });

    it('should handle partial updates (only price)', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'prod-1',
        name: 'Test',
      });

      const dto = {
        updates: [{ productId: 'prod-1', basePrice: 3000 }],
      };

      const result = await service.bulkUpdate(dto, 'admin-1');

      expect(result.updated).toBe(1);
      const updateCall = (prisma.product.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).toEqual({ basePrice: 3000 });
    });
  });

  describe('exportAll', () => {
    it('should return all non-deleted products', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: '1',
          name: 'Product 1',
          slug: 'product-1',
          description: 'Desc',
          basePrice: 1000,
          salePrice: 800,
          stock: 10,
          isActive: true,
          isFeatured: false,
          isRentable: false,
          isSellable: true,
          categoryId: 'cat-1',
          brandId: null,
          fabric: 'Silk',
          hsnCode: null,
          createdAt: new Date('2026-01-01'),
        },
      ]);

      const result = await service.exportAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Product 1');
      expect(result[0].basePrice).toBe(1000);
      expect(result[0].salePrice).toBe(800);
    });

    it('should return empty array when no products exist', async () => {
      const result = await service.exportAll();
      expect(result).toEqual([]);
    });
  });
});
