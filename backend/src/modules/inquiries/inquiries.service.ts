import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';

@Injectable()
export class InquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInquiryDto) {
    return this.prisma.inquiry.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        message: dto.message,
        productId: dto.productId,
        status: 'NEW',
      },
    });
  }

  async findAll(status?: string) {
    const where = status ? { status: status as never } : {};
    return this.prisma.inquiry.findMany({
      where,
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    });
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async update(id: string, dto: UpdateInquiryDto) {
    await this.findById(id);
    return this.prisma.inquiry.update({
      where: { id },
      data: {
        status: dto.status,
        assignedAdminId: dto.assignedAdminId,
        resolutionNotes: dto.resolutionNotes,
      },
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
