import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { slugify } from '../../common/utils/slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tree?: boolean) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!tree) {
      return categories;
    }

    // Build nested tree
    const categoryMap = new Map<string, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of categories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        (categoryMap.get(cat.parentId)!.children as Record<string, unknown>[]).push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
            isActive: true,
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    let slug = dto.slug;
    if (!slug) {
      slug = slugify(dto.name);
      let counter = 1;
      const baseSlug = slug;
      while (await this.prisma.category.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        image: dto.image ?? null,
        parentId: dto.parentId ?? null,
        isActive: true,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Prevent circular parent reference
    if (dto.parentId === id) {
      throw new NotFoundException('A category cannot be its own parent');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.image !== undefined ? { image: dto.image } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: { select: { id: true } },
        products: { select: { id: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has children or products
    if (category.children.length > 0) {
      // Unset parent for children instead of deleting
      await this.prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });
    }

    // Soft-delete by setting isActive to false
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
