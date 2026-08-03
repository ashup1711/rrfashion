import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ColorsService } from './colors.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  color: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  productVariant: {
    count: jest.fn(),
  },
};

describe('ColorsService', () => {
  let service: ColorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ColorsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ColorsService>(ColorsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active colors sorted by sortOrder then name', async () => {
      const expected = [
        {
          id: '1',
          name: 'Black',
          hexCode: '#000000',
          isActive: true,
          sortOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.color.findMany.mockResolvedValue(expected);

      const result = await service.findAll();

      expect(result).toEqual(expected);
      expect(mockPrisma.color.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('findById', () => {
    it('should return a color by id', async () => {
      const expected = {
        id: '1',
        name: 'Black',
        hexCode: '#000000',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.color.findUnique.mockResolvedValue(expected);

      const result = await service.findById('1');
      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException when color does not exist', async () => {
      mockPrisma.color.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a color with isActive: true', async () => {
      const dto = { name: 'Navy Blue', hexCode: '#000080', sortOrder: 1 };
      const expected = {
        id: 'new',
        ...dto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.color.create.mockResolvedValue(expected);

      const result = await service.create(dto);
      expect(result).toEqual(expected);
      expect(mockPrisma.color.create).toHaveBeenCalledWith({
        data: { name: dto.name, hexCode: dto.hexCode, sortOrder: 1, isActive: true },
      });
    });

    it('should default sortOrder to 0 when not provided', async () => {
      const dto = { name: 'Black', hexCode: '#000000' };
      mockPrisma.color.create.mockResolvedValue({
        id: 'new',
        ...dto,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create(dto);
      expect(mockPrisma.color.create).toHaveBeenCalledWith({
        data: { name: dto.name, hexCode: dto.hexCode, sortOrder: 0, isActive: true },
      });
    });
  });

  describe('update', () => {
    it('should update a color partially', async () => {
      const existing = {
        id: '1',
        name: 'Old Name',
        hexCode: '#000000',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const updated = { ...existing, name: 'New Name' };
      mockPrisma.color.findUnique.mockResolvedValue(existing);
      mockPrisma.color.update.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
      expect(mockPrisma.color.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'New Name' },
      });
    });

    it('should throw NotFoundException when color does not exist', async () => {
      mockPrisma.color.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting isActive to false', async () => {
      mockPrisma.color.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.color.update.mockResolvedValue({ id: '1', isActive: false });

      await service.remove('1');
      expect(mockPrisma.color.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when color does not exist', async () => {
      mockPrisma.color.findUnique.mockResolvedValue(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
