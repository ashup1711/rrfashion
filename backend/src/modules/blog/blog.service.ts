import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination';
import type { PaginatedResponse } from '../../common/types/pagination';
import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
];

const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'];

function sanitizeHtml(content: string): string {
  if (content === '') return '';
  return DOMPurify.sanitize(content, { ALLOWED_TAGS, ALLOWED_ATTR });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const baseSlug = slugify(title).slice(0, 60);

    const existing = await this.prisma.blogPost.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    });

    if (existing.length === 0) return baseSlug;

    const slugs = new Set(existing.map(e => e.slug));
    if (!slugs.has(baseSlug)) return baseSlug;

    let i = 2;
    while (slugs.has(`${baseSlug}-${i}`)) i++;
    return `${baseSlug}-${i}`;
  }

  async create(dto: CreateBlogDto, adminId?: string) {
    const slug = dto.slug
      ? await this.generateUniqueSlug(dto.slug)
      : await this.generateUniqueSlug(dto.title);

    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: sanitizeHtml(dto.content),
        imageUrl: dto.imageUrl ?? null,
        category: dto.category ?? null,
        tags: dto.tags ?? [],
        author: dto.author ?? null,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
        createdBy: adminId ?? null,
      },
    });
  }

  async findAll(query: PaginationDto & { status?: string; category?: string }): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (query.status === 'published') {
      where.isPublished = true;
    } else if (query.status === 'draft') {
      where.isPublished = false;
    }
    if (query.category) {
      where.category = query.category;
    }

    return paginate(this.prisma.blogPost, {
      where,
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    });
  }

  async findPublished(query: PaginationDto & { category?: string }): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const now = new Date();

    const where: Record<string, unknown> = {
      isPublished: true,
      publishedAt: { lte: now },
    };
    if (query.category) {
      where.category = query.category;
    }

    return paginate(this.prisma.blogPost, {
      where,
      orderBy: { publishedAt: 'desc' },
      page,
      limit,
    });
  }

  async findBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post || !post.isPublished || (post.publishedAt && post.publishedAt > new Date())) {
      throw new NotFoundException('Blog post not found');
    }
    return post;
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async update(id: string, dto: UpdateBlogDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.content !== undefined) data.content = sanitizeHtml(dto.content);
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.author !== undefined) data.author = dto.author;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;
    if (dto.publishedAt !== undefined) data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;

    if (dto.slug !== undefined) {
      data.slug = await this.generateUniqueSlug(dto.slug, id);
    } else if (dto.title !== undefined) {
      data.slug = await this.generateUniqueSlug(dto.title, id);
    }

    return this.prisma.blogPost.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.blogPost.delete({ where: { id } });
    return { message: 'Blog post deleted successfully' };
  }
}
