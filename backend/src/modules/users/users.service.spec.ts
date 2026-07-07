import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      count: jest.fn(),
    },
    rentalBooking: {
      count: jest.fn(),
    },
    refreshToken: {
      updateMany: jest.fn(),
    },
  };

  const mockStorage = {
    upload: jest.fn(),
    download: jest.fn(),
    getPublicUrl: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have prisma service injected', () => {
    expect(prisma).toBeDefined();
  });

  describe('deleteMyAccount', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hashed-password',
      isActive: true,
      isGuest: false,
      role: 'CUSTOMER',
      deletedAt: null,
      phone: null,
    };

    it('should delete account with valid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.rentalBooking.count.mockResolvedValue(0);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
        isActive: false,
      });

      const result = await service.deleteMyAccount('user-1', {
        password: 'CorrectPassword1!',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Account has been deleted');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          isActive: false,
        }),
      });
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });

    it('should reject invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.deleteMyAccount('user-1', { password: 'WrongPassword1!' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject deletion with active orders', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.order.count.mockResolvedValue(2);

      await expect(
        service.deleteMyAccount('user-1', { password: 'CorrectPassword1!' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should reject deletion with active rentals', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.rentalBooking.count.mockResolvedValue(1);

      await expect(
        service.deleteMyAccount('user-1', { password: 'CorrectPassword1!' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteMyAccount('non-existent', { password: 'Password1!' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockProfile = {
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890',
        role: 'CUSTOMER',
        profilePhoto: null,
        profilePhotoKey: null,
        addresses: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile('user-1');

      expect(result.email).toBe('test@test.com');
      expect(result.firstName).toBe('Test');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.objectContaining({
          email: true,
          firstName: true,
          addresses: true,
        }),
      });
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for deactivated user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        isActive: false,
      });

      await expect(service.getProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
