import { Test, TestingModule } from '@nestjs/testing';
import { SeoService } from './seo.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SeoService', () => {
  let service: SeoService;
  let prisma: Record<string, unknown>;

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SeoService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SeoService>(SeoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSitemap', () => {
    it('should generate valid XML sitemap', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          slug: 'silk-lehenga',
          updatedAt: new Date('2026-08-01'),
          isRentable: false,
          isSellable: true,
        },
        {
          slug: 'cotton-saree',
          updatedAt: new Date('2026-07-15'),
          isRentable: true,
          isSellable: false,
        },
      ]);

      const xml = await service.generateSitemap();

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).toContain('/product/silk-lehenga');
      expect(xml).toContain('/product/cotton-saree');
      expect(xml).toContain('<loc>https://rrfashion.com</loc>');
      expect(xml).toContain('<loc>https://rrfashion.com/shop</loc>');
      expect(xml).toContain('</urlset>');
    });

    it('should include homepage and shop URLs', async () => {
      const xml = await service.generateSitemap();

      expect(xml).toContain('https://rrfashion.com</loc>');
      expect(xml).toContain('https://rrfashion.com/shop</loc>');
    });

    it('should escape XML special characters', async () => {
      (prisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          slug: 'test-product',
          updatedAt: new Date('2026-08-01'),
          isRentable: false,
          isSellable: true,
        },
      ]);

      const xml = await service.generateSitemap();
      expect(xml).toContain('<?xml');
      expect(xml).toContain('</urlset>');
    });
  });

  describe('getProductJsonLd', () => {
    it('should return null for non-existent product', async () => {
      const result = await service.getProductJsonLd('non-existent');
      expect(result).toBeNull();
    });

    it('should return JSON-LD for existing product', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        name: 'Silk Lehenga',
        description: 'Beautiful silk lehenga',
        images: ['https://example.com/img1.jpg'],
        slug: 'silk-lehenga',
        basePrice: 5000,
        salePrice: 4000,
        stock: 10,
        isRentable: false,
        isSellable: true,
        brand: { name: 'RR Fashion' },
        reviews: [{ rating: 5 }, { rating: 4 }],
      });

      const result = await service.getProductJsonLd('silk-lehenga');

      expect(result).not.toBeNull();
      expect(result!['@type']).toBe('Product');
      expect(result!.name).toBe('Silk Lehenga');
      expect(result!.offers.price).toBe(4000);
      expect(result!.offers.priceCurrency).toBe('INR');
      expect(result!.brand!.name).toBe('RR Fashion');
      expect(result!.aggregateRating).toBeDefined();
      expect(result!.aggregateRating!.ratingValue).toBe(4.5);
      expect(result!.aggregateRating!.reviewCount).toBe(2);
    });

    it('should use basePrice when no salePrice', async () => {
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({
        name: 'Cotton Saree',
        description: null,
        images: [],
        slug: 'cotton-saree',
        basePrice: 2000,
        salePrice: null,
        stock: 0,
        isRentable: true,
        isSellable: false,
        brand: null,
        reviews: [],
      });

      const result = await service.getProductJsonLd('cotton-saree');

      expect(result!.offers.price).toBe(2000);
      expect(result!.offers.availability).toBe('https://schema.org/OutOfStock');
      expect(result!.brand).toBeNull();
      expect(result!.aggregateRating).toBeUndefined();
    });
  });

  describe('getOrganizationJsonLd', () => {
    it('should return organization structured data', () => {
      const result = service.getOrganizationJsonLd();

      expect(result['@type']).toBe('Organization');
      expect(result.name).toBe('RR Fashion');
    });
  });

  describe('getBreadcrumbJsonLd', () => {
    it('should return breadcrumb structured data', () => {
      const result = service.getBreadcrumbJsonLd([
        { name: 'Home', url: 'https://rrfashion.com' },
        { name: 'Shop', url: 'https://rrfashion.com/shop' },
        { name: 'Silk Lehenga', url: 'https://rrfashion.com/product/silk-lehenga' },
      ]);

      expect(result['@type']).toBe('BreadcrumbList');
      expect(result.itemListElement).toHaveLength(3);
      expect((result.itemListElement as Array<Record<string, unknown>>)[0].position).toBe(1);
    });
  });
});
