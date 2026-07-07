import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.storeLocation.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const store = await this.prisma.storeLocation.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            inventoryUnits: true,
            orders: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return store;
  }

  async create(dto: CreateStoreDto) {
    return this.prisma.storeLocation.create({
      data: {
        name: dto.name,
        address: dto.address,
        city: dto.city ?? null,
        state: dto.state,
        pincode: dto.pincode ?? null,
        gstin: dto.gstin,
        phone: dto.phone ?? null,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateStoreDto) {
    const store = await this.prisma.storeLocation.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return this.prisma.storeLocation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.pincode !== undefined ? { pincode: dto.pincode } : {}),
        ...(dto.gstin !== undefined ? { gstin: dto.gstin } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
