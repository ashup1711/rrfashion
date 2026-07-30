import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';

@Injectable()
export class SizesService {
  private readonly logger = new Logger(SizesService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.size.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    const size = await this.prisma.size.findUnique({ where: { id } });

    if (!size) {
      throw new NotFoundException('Size not found');
    }

    return size;
  }

  async create(dto: CreateSizeDto) {
    return this.prisma.size.create({
      data: {
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateSizeDto) {
    const size = await this.prisma.size.findUnique({ where: { id } });

    if (!size) {
      throw new NotFoundException('Size not found');
    }

    return this.prisma.size.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string): Promise<void> {
    const size = await this.prisma.size.findUnique({ where: { id } });

    if (!size) {
      throw new NotFoundException('Size not found');
    }

    // Check if any active variants use this size name
    const variantCount = await this.prisma.productVariant.count({
      where: { size: size.name, deletedAt: null, isActive: true },
    });

    if (variantCount > 0) {
      this.logger.warn(`Size "${size.name}" deactivated but is used by ${variantCount} active variant(s)`);
    }

    // Soft-delete by setting isActive to false
    await this.prisma.size.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
