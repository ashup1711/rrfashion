import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';

const VALID_STATUSES = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

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
    let where: Record<string, unknown> = {};

    if (status) {
      // Special case: "ASSIGNED" means inquiries where assignedAdminId is not null
      if (status === 'ASSIGNED') {
        where = { assignedAdminId: { not: null } };
      } else if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
        throw new BadRequestException(
          `Invalid status "${status}". Valid values: ${[...VALID_STATUSES, 'ASSIGNED'].join(', ')}`,
        );
      } else {
        where = { status };
      }
    }

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
