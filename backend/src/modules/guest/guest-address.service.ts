import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateGuestAddressDto,
  UpdateGuestAddressDto,
  GuestAddressResponseDto,
} from './dto/guest-address.dto';

@Injectable()
export class GuestAddressService {
  private readonly logger = new Logger(GuestAddressService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findBySession(guestSessionId: string): Promise<GuestAddressResponseDto[]> {
    const addresses = await this.prisma.guestAddress.findMany({
      where: { guestSessionId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return addresses.map((addr) => this.toResponse(addr));
  }

  async create(
    guestSessionId: string,
    dto: CreateGuestAddressDto,
  ): Promise<GuestAddressResponseDto> {
    if (dto.isDefault) {
      await this.prisma.guestAddress.updateMany({
        where: { guestSessionId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.guestAddress.create({
      data: {
        guestSessionId,
        label: dto.label,
        fullName: dto.fullName,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country ?? 'India',
        isDefault: dto.isDefault ?? false,
      },
    });

    this.logger.log({
      guestSessionId,
      addressId: address.id,
      action: 'guest.address.created',
    });

    return this.toResponse(address);
  }

  async update(
    guestSessionId: string,
    id: string,
    dto: UpdateGuestAddressDto,
  ): Promise<GuestAddressResponseDto> {
    const address = await this.prisma.guestAddress.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.guestSessionId !== guestSessionId) {
      throw new NotFoundException('Address not found');
    }

    if (dto.isDefault) {
      await this.prisma.guestAddress.updateMany({
        where: { guestSessionId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.guestAddress.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { label: dto.label }),
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
        ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    this.logger.log({
      guestSessionId,
      addressId: id,
      action: 'guest.address.updated',
    });

    return this.toResponse(updated);
  }

  async delete(guestSessionId: string, id: string): Promise<{ success: boolean }> {
    const address = await this.prisma.guestAddress.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.guestSessionId !== guestSessionId) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.guestAddress.delete({
      where: { id },
    });

    this.logger.log({
      guestSessionId,
      addressId: id,
      action: 'guest.address.deleted',
    });

    return { success: true };
  }

  async setDefault(guestSessionId: string, id: string): Promise<GuestAddressResponseDto> {
    const address = await this.prisma.guestAddress.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.guestSessionId !== guestSessionId) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.guestAddress.updateMany({
      where: { guestSessionId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.guestAddress.update({
      where: { id },
      data: { isDefault: true },
    });

    this.logger.log({
      guestSessionId,
      addressId: id,
      action: 'guest.address.setDefault',
    });

    return this.toResponse(updated);
  }

  async findBySessionRaw(guestSessionId: string) {
    return this.prisma.guestAddress.findMany({
      where: { guestSessionId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private toResponse(address: {
    id: string;
    label: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): GuestAddressResponseDto {
    return {
      id: address.id,
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? undefined,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
