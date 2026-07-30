import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@Injectable()
export class ColorsService {
  private readonly logger = new Logger(ColorsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.color.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const color = await this.prisma.color.findUnique({ where: { id } });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    return color;
  }

  async create(dto: CreateColorDto) {
    return this.prisma.color.create({
      data: {
        name: dto.name,
        hexCode: dto.hexCode,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateColorDto) {
    const color = await this.prisma.color.findUnique({ where: { id } });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    return this.prisma.color.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.hexCode !== undefined ? { hexCode: dto.hexCode } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    const color = await this.prisma.color.findUnique({ where: { id } });

    if (!color) {
      throw new NotFoundException('Color not found');
    }

    // Check if any active variants use this color name
    const variantCount = await this.prisma.productVariant.count({
      where: { color: color.name, deletedAt: null, isActive: true },
    });

    if (variantCount > 0) {
      this.logger.warn(`Color "${color.name}" deactivated but is used by ${variantCount} active variant(s)`);
    }

    // Soft-delete by setting isActive to false
    await this.prisma.color.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
