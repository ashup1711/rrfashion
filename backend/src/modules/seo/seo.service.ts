import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_SITEMAP_BASE_URL = 'https://rrfashion.com';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: number;
}

export interface ProductJsonLd {
  '@context': string;
  '@type': string;
  name: string;
  description: string | null;
  image: string[];
  url: string;
  sku: string | null;
  brand: { '@type': string; name: string } | null;
  offers: {
    '@type': string;
    priceCurrency: string;
    price: number;
    availability: string;
    url: string;
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
  };
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly sitemapBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.sitemapBaseUrl = this.config.get<string>('SITEMAP_BASE_URL', DEFAULT_SITEMAP_BASE_URL);
  }

  /**
   * REQ-BE-014: Generate sitemap.xml for all published/active products.
   * Returns a string of valid XML.
   */
  async generateSitemap(): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        slug: true,
        updatedAt: true,
        isRentable: true,
        isSellable: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    const urls: SitemapUrl[] = [];

    // Homepage
    urls.push({
      loc: this.sitemapBaseUrl,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 1.0,
    });

    // Shop page
    urls.push({
      loc: `${this.sitemapBaseUrl}/shop`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: 0.9,
    });

    // Product pages
    for (const product of products) {
      const lastmod = product.updatedAt.toISOString().split('T')[0];
      urls.push({
        loc: `${this.sitemapBaseUrl}/product/${product.slug}`,
        lastmod,
        changefreq: product.isRentable ? 'weekly' : 'monthly',
        priority: 0.8,
      });
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${this.escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

    return xml;
  }

  /**
   * REQ-BE-014: Generate JSON-LD structured data for a product page.
   * Returns a script tag string ready to be embedded in <head>.
   */
  async getProductJsonLd(slug: string): Promise<ProductJsonLd | null> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        images: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        stock: true,
        isRentable: true,
        isSellable: true,
        brand: { select: { name: true } },
        reviews: {
          select: { rating: true },
          where: { status: 'APPROVED' as const },
        },
      },
    });

    if (!product) {
      return null;
    }

    const price = product.salePrice ? Number(product.salePrice) : Number(product.basePrice);
    const url = `${this.sitemapBaseUrl}/product/${product.slug}`;

    const jsonLd: ProductJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images,
      url,
      sku: null,
      brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : null,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price,
        availability:
          product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
      },
    };

    // Add aggregate rating if reviews exist
    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRating / product.reviews.length;
      jsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Math.round(avgRating * 10) / 10,
        reviewCount: product.reviews.length,
      };
    }

    return jsonLd;
  }

  /**
   * Generate Organization JSON-LD for the site footer/layout.
   */
  getOrganizationJsonLd(): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'RR Fashion',
      url: this.sitemapBaseUrl,
      logo: `${this.sitemapBaseUrl}/logo.png`,
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['English', 'Hindi'],
      },
    };
  }

  /**
   * Generate BreadcrumbList JSON-LD for product pages.
   */
  getBreadcrumbJsonLd(items: Array<{ name: string; url: string }>): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
