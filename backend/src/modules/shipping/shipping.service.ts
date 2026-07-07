import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddAddressDto } from './dto/add-address.dto';
import { AddCourierDto } from './dto/add-courier.dto';
import { CheckPincodeDto } from './dto/check-pincode.dto';

@Injectable()
export class ShippingService {
  // Serviceable pincode prefixes for India (initial set, admin-configurable later)
  private readonly SERVICEABLE_PREFIXES = [
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '32',
    '33',
    '34',
    '35',
    '36',
    '37',
    '38',
    '39',
    '40',
    '41',
    '42',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
    '50',
    '51',
    '52',
    '53',
    '54',
    '55',
    '56',
    '57',
    '58',
    '59',
    '60',
    '61',
    '62',
    '63',
    '64',
    '65',
    '66',
    '67',
    '68',
    '69',
    '70',
    '71',
    '72',
    '73',
    '74',
    '75',
    '76',
    '77',
    '78',
    '79',
    '80',
    '81',
    '82',
    '83',
    '84',
    '85',
    '86',
    '87',
    '88',
    '89',
    '90',
    '91',
    '92',
    '93',
    '94',
    '95',
    '96',
    '97',
    '98',
    '99',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async addAddress(orderId: string, dto: AddAddressDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const address = await this.prisma.shippingAddress.create({
      data: {
        orderId,
        name: dto.name,
        phone: dto.phone,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country || 'IND',
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        shippingAddress: {
          name: dto.name,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          country: dto.country || 'IND',
        },
      },
    });

    return address;
  }

  async getAddress(orderId: string) {
    return this.prisma.shippingAddress.findMany({
      where: { orderId },
    });
  }

  async addCourier(orderId: string, adminId: string, dto: AddCourierDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const receipt = await this.prisma.courierReceipt.create({
      data: {
        orderId,
        courierName: dto.courierName,
        awbNumber: dto.awbNumber,
        trackingUrl: dto.trackingUrl,
        receiptFileUrl: dto.receiptFileUrl,
        source: 'manual',
        enteredByAdminId: adminId,
      },
    });

    return receipt;
  }

  async getCourierReceipts(orderId: string) {
    return this.prisma.courierReceipt.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkPincode(dto: CheckPincodeDto) {
    const { pincode } = dto;

    if (!/^\d{6}$/.test(pincode)) {
      throw new BadRequestException('Invalid pincode format');
    }

    const prefix = pincode.slice(0, 2);
    const serviceable = this.SERVICEABLE_PREFIXES.includes(prefix);

    const estimatedDays = this.getEstimatedDays(pincode);

    return {
      pincode,
      serviceable,
      estimatedDeliveryDays: serviceable ? estimatedDays : null,
      message: serviceable
        ? `Delivery available in ${estimatedDays} business days`
        : 'Currently not serviceable',
    };
  }

  private getEstimatedDays(_pincode: string): number {
    return 3;
  }
}
