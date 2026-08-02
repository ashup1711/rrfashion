import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SiteRemindersService } from './site-reminders.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SiteRemindersService', () => {
  let service: SiteRemindersService;
  let prisma: typeof mockPrisma;

  const mockPrisma = {
    siteReminder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SiteRemindersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<SiteRemindersService>(SiteRemindersService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      title: 'Summer Sale',
      message: 'Get 20% off',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-08-01T00:00:00.000Z',
      isActive: true,
    };

    it('should create a reminder', async () => {
      const expected = {
        id: 'uuid',
        ...dto,
        linkUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.siteReminder.create.mockResolvedValue(expected);

      const result = await service.create(dto);

      expect(prisma.siteReminder.create).toHaveBeenCalledWith({
        data: {
          title: 'Summer Sale',
          message: 'Get 20% off',
          linkUrl: null,
          startDate: new Date('2026-07-01T00:00:00.000Z'),
          endDate: new Date('2026-08-01T00:00:00.000Z'),
          isActive: true,
        },
      });
      expect(result).toEqual(expected);
    });

    it('should create with linkUrl', async () => {
      const dtoWithLink = { ...dto, linkUrl: '/shop' };
      prisma.siteReminder.create.mockResolvedValue({
        id: 'uuid',
        ...dtoWithLink,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(dtoWithLink);

      expect(prisma.siteReminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ linkUrl: '/shop' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a reminder if found', async () => {
      const expected = { id: 'uuid', title: 'Test' };
      prisma.siteReminder.findUnique.mockResolvedValue(expected);

      const result = await service.findById('uuid');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.siteReminder.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const reminders = [
        { id: '1', title: 'A' },
        { id: '2', title: 'B' },
      ];
      prisma.siteReminder.findMany.mockResolvedValue(reminders);
      prisma.siteReminder.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result).toEqual({ data: reminders, meta: { page: 1, limit: 20, total: 2 } });
    });

    it('should search by title', async () => {
      prisma.siteReminder.findMany.mockResolvedValue([]);
      prisma.siteReminder.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 20 }, 'Summer');

      expect(prisma.siteReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'Summer', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update if exists', async () => {
      prisma.siteReminder.findUnique.mockResolvedValue({ id: 'uuid' });
      prisma.siteReminder.update.mockResolvedValue({ id: 'uuid', title: 'Updated' });

      const result = await service.update('uuid', { title: 'Updated' });

      expect(prisma.siteReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'uuid' },
          data: expect.objectContaining({ title: 'Updated' }),
        }),
      );
      expect(result.title).toBe('Updated');
    });

    it('should throw if not found', async () => {
      prisma.siteReminder.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { title: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete if exists', async () => {
      prisma.siteReminder.findUnique.mockResolvedValue({ id: 'uuid' });
      prisma.siteReminder.delete.mockResolvedValue({ id: 'uuid' });

      const result = await service.remove('uuid');

      expect(prisma.siteReminder.delete).toHaveBeenCalledWith({ where: { id: 'uuid' } });
      expect(result).toEqual({ message: 'Reminder deleted successfully' });
    });

    it('should throw if not found', async () => {
      prisma.siteReminder.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findActive', () => {
    it('should return active reminders within date range', async () => {
      const now = new Date();
      const reminders = [
        {
          id: '1',
          title: 'Active',
          message: 'Test',
          linkUrl: null,
          startDate: new Date(now.getTime() - 86400000),
          endDate: new Date(now.getTime() + 86400000),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.siteReminder.findMany.mockResolvedValue(reminders);

      const result = await service.findActive();

      expect(prisma.siteReminder.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          startDate: { lte: expect.any(Date) },
          endDate: { gte: expect.any(Date) },
        },
        orderBy: { startDate: 'desc' },
      });

      // Should strip internal fields
      expect(result[0]).toEqual({
        id: '1',
        title: 'Active',
        message: 'Test',
        linkUrl: null,
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
      expect(result[0]).not.toHaveProperty('isActive');
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });

    it('should return empty array when no active reminders', async () => {
      prisma.siteReminder.findMany.mockResolvedValue([]);
      const result = await service.findActive();
      expect(result).toEqual([]);
    });
  });
});
