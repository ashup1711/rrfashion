import { Controller, Get, Param, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { SeoService } from './seo.service';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /**
   * REQ-BE-014: Public sitemap.xml endpoint.
   * Returns XML with Cache-Control headers for CDN caching (SEC-14).
   */
  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  @ApiOperation({ summary: 'Generate sitemap.xml for all active products' })
  async getSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.seoService.generateSitemap();
    res.send(xml);
  }

  /**
   * REQ-BE-014: JSON-LD structured data for a product page.
   * Public endpoint — no auth required.
   */
  @Public()
  @Get('product/:slug/json-ld')
  @Header('Cache-Control', 'public, max-age=300, s-maxage=3600')
  @ApiCommonResponse({ summary: 'Get JSON-LD structured data for a product', auth: false })
  async getProductJsonLd(@Param('slug') slug: string) {
    const jsonLd = await this.seoService.getProductJsonLd(slug);
    if (!jsonLd) {
      return { '@context': 'https://schema.org', '@type': 'Product', name: slug };
    }
    return jsonLd;
  }

  /**
   * REQ-BE-014: Organization JSON-LD for site-wide structured data.
   */
  @Public()
  @Get('organization/json-ld')
  @Header('Cache-Control', 'public, max-age=86400, s-maxage=604800')
  @ApiCommonResponse({ summary: 'Get Organization JSON-LD structured data', auth: false })
  getOrganizationJsonLd() {
    return this.seoService.getOrganizationJsonLd();
  }
}
