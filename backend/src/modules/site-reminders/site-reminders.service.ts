import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSiteReminderDto } from './dto/create-site-reminder.dto';
import { UpdateSiteReminderDto } from './dto/update-site-reminder.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class SiteRemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSiteReminderDto) {
    return this.prisma.siteReminder.create({
      data: {
        title: dto.title,
        message: dto.message,
        linkUrl: dto.linkUrl || null,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query: PaginationDto, search?: string) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.siteReminder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.siteReminder.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total },
    };
  }

  async findById(id: string) {
    const reminder = await this.prisma.siteReminder.findUnique({ where: { id } });
    if (!reminder) throw new NotFoundException('Site reminder not found');
    return reminder;
  }

  async update(id: string, dto: UpdateSiteReminderDto) {
    await this.findById(id);

    return this.prisma.siteReminder.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.siteReminder.delete({ where: { id } });
    return { message: 'Reminder deleted successfully' };
  }

  async findActive() {
    const now = new Date();
    const reminders = await this.prisma.siteReminder.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: 'desc' },
    });

    // Return minimal payload — no isActive, createdAt, updatedAt
    return reminders.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      linkUrl: r.linkUrl,
      startDate: r.startDate,
      endDate: r.endDate,
    }));
  }
}
