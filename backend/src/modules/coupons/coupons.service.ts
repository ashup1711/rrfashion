import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ApplyCouponDto } from './dto/apply-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code.toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        type: dto.type,
        value: dto.value,
        minCartValue: dto.minCartValue || 0,
        maxDiscount: dto.maxDiscount,
        appliesTo: dto.appliesTo || 'ALL',
        categoryIds: dto.categoryIds || [],
        brandIds: dto.brandIds || [],
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit || 1,
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findById(id);

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code?.toUpperCase(),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.coupon.delete({ where: { id } });
    return { message: 'Coupon deleted' };
  }

  async apply(dto: ApplyCouponDto) {
    const { code, userId, cartItemIds } = dto;

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    const now = new Date();
    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive');
    }
    if (now < coupon.validFrom) {
      throw new BadRequestException('Coupon not yet valid');
    }
    if (now > coupon.validUntil) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const userUsageCount = await this.prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw new BadRequestException('You have already used this coupon');
    }

    const cartItems = await this.prisma.cartItem.findMany({
      where: { id: { in: cartItemIds } },
      include: {
        variant: { select: { salePrice: true, rentPricePerDay: true } },
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let subtotal = 0;
    for (const item of cartItems) {
      const price =
        item.type === 'rent'
          ? item.variant?.rentPricePerDay?.toNumber() || 0
          : item.variant?.salePrice?.toNumber() || 0;
      subtotal += price * item.quantity;
    }

    if (subtotal < coupon.minCartValue.toNumber()) {
      throw new BadRequestException(
        `Minimum cart value of ₹${coupon.minCartValue.toNumber()} required`,
      );
    }

    if (coupon.appliesTo !== 'ALL') {
      const allMatchType = cartItems.every((i) => i.type === coupon.appliesTo.toLowerCase());
      if (!allMatchType) {
        throw new BadRequestException(`Coupon valid for ${coupon.appliesTo} items only`);
      }
    }

    let discount =
      coupon.type === 'PERCENT'
        ? Math.round(((subtotal * coupon.value.toNumber()) / 100) * 100) / 100
        : coupon.value.toNumber();

    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount.toNumber());
    }

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      discount,
      subtotal,
      totalAfterDiscount: subtotal - discount,
      description: coupon.description,
    };
  }
}
