import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GuestAddressService } from './guest-address.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('GuestAddressService (FIX-1 — anonymous IDOR)', () => {
  let service: GuestAddressService;

  const mockPrisma = {
    guestAddress: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const addressRow = {
    id: 'addr-1',
    guestSessionId: 'session-1',
    label: 'Home',
    fullName: 'Test User',
    phone: '9999999999',
    addressLine1: '123 Test St',
    addressLine2: null,
    city: 'Mumbai',
    state: 'MH',
    postalCode: '400001',
    country: 'India',
    isDefault: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GuestAddressService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<GuestAddressService>(GuestAddressService);
    jest.clearAllMocks();
  });

  describe('findBySession', () => {
    it('throws BadRequestException when guestSessionId is undefined — Prisma is never called', async () => {
      await expect(service.findBySession(undefined as unknown as string)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.findBySession('')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.guestAddress.findMany).not.toHaveBeenCalled();
    });

    it('scopes the query to the given guest session only (own addresses)', async () => {
      mockPrisma.guestAddress.findMany.mockResolvedValue([addressRow]);

      const result = await service.findBySession('session-1');

      expect(mockPrisma.guestAddress.findMany).toHaveBeenCalledWith({
        where: { guestSessionId: 'session-1' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'addr-1', phone: '9999999999' });
    });
  });

  describe('findBySessionRaw', () => {
    it('throws BadRequestException for a missing guest session id', async () => {
      await expect(service.findBySessionRaw(undefined as unknown as string)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.guestAddress.findMany).not.toHaveBeenCalled();
    });
  });
});
