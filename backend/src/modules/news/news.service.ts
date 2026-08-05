import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/utils/pagination';
import type { PaginatedResponse } from '../../common/types/pagination';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNewsDto, adminId?: string) {
    return this.prisma.news.create({
      data: {
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content ?? null,
        imageUrl: dto.imageUrl ?? null,
        linkUrl: dto.linkUrl ?? null,
        linkText: dto.linkText ?? null,
        category: dto.category ?? null,
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        sortOrder: dto.sortOrder ?? 0,
        createdBy: adminId ?? null,
      },
    });
  }

  async findAll(query: PaginationDto, search?: string): Promise<PaginatedResponse<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return paginate(this.prisma.news, {
      where,
      orderBy: { sortOrder: 'asc' },
      page,
      limit,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.news.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('News item not found');
    return item;
  }

  async update(id: string, dto: UpdateNewsDto) {
    await this.findOne(id);

    return this.prisma.news.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl }),
        ...(dto.linkText !== undefined && { linkText: dto.linkText }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.news.delete({ where: { id } });
    return { message: 'News item deleted successfully' };
  }

  async findActive() {
    const now = new Date();
    return this.prisma.news.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        imageUrl: true,
        linkUrl: true,
        linkText: true,
        category: true,
        startDate: true,
        endDate: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
