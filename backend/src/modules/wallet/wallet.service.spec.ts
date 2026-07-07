import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: typeof mockPrisma;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    walletTransaction: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = mockPrisma;
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('returns balance for existing user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.walletTransaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 500 } },
      });

      const result = await service.getBalance('u1');
      expect(result.balance).toBe(500);
    });

    it('returns zero when no transactions', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.walletTransaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await service.getBalance('u1');
      expect(result.balance).toBe(0);
    });

    it('throws for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getBalance('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('credit', () => {
    const dto = {
      userId: 'u1',
      amount: 200,
      type: 'REFUND' as const,
      referenceId: 'r1',
      referenceType: 'ORDER' as const,
    };

    it('adds credit to wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.walletTransaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 500 } },
      });
      prisma.walletTransaction.create.mockResolvedValue({
        id: 'tx1',
        amount: 200,
        balanceAfter: 700,
      });

      const result = await service.credit(dto);
      expect(result.amount).toBe(200);
      expect(result.balanceAfter).toBe(700);
    });

    it('throws for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.credit(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('debit', () => {
    const dto = {
      userId: 'u1',
      amount: 100,
      type: 'ORDER_PAYMENT' as const,
      referenceId: 'o1',
      referenceType: 'ORDER' as const,
    };

    it('deducts from wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.walletTransaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 500 } },
      });
      prisma.walletTransaction.create.mockResolvedValue({
        id: 'tx1',
        amount: -100,
        balanceAfter: 400,
      });

      const result = await service.debit(dto);
      expect(result.amount).toBe(-100);
      expect(result.balanceAfter).toBe(400);
    });

    it('throws on insufficient balance', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.walletTransaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 50 } },
      });

      await expect(service.debit(dto)).rejects.toThrow(BadRequestException);
    });

    it('throws for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.debit(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTransactions', () => {
    it('returns transaction history', async () => {
      prisma.walletTransaction.findMany.mockResolvedValue([
        { id: 'tx1', amount: 200 },
        { id: 'tx2', amount: -100 },
      ]);

      const result = await service.getTransactions('u1');
      expect(result).toHaveLength(2);
    });
  });

  describe('getAllTransactions', () => {
    it('returns paginated transactions with user info', async () => {
      const items = [
        {
          id: 'tx1',
          amount: 200,
          type: 'REFUND',
          user: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        },
        {
          id: 'tx2',
          amount: -100,
          type: 'ORDER_PAYMENT',
          user: { id: 'u2', firstName: 'Jane', lastName: 'Doe', email: 'jane@test.com' },
        },
      ];
      prisma.walletTransaction.findMany.mockResolvedValue(items);
      prisma.walletTransaction.count.mockResolvedValue(2);

      const result = await service.getAllTransactions({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });

    it('filters by type when provided', async () => {
      prisma.walletTransaction.findMany.mockResolvedValue([]);
      prisma.walletTransaction.count.mockResolvedValue(0);

      await service.getAllTransactions({ page: 1, limit: 10, type: 'REFUND' });

      expect(prisma.walletTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'REFUND' },
        }),
      );
    });
  });

  describe('getStats', () => {
    it('returns aggregated wallet stats', async () => {
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 10000 } } })
        .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => -4000 } } });
      prisma.walletTransaction.groupBy.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
        { userId: 'u3' },
      ]);

      const result = await service.getStats();

      expect(result.totalBalance).toBe(6000);
      expect(result.totalCredited).toBe(10000);
      expect(result.totalDebited).toBe(4000);
      expect(result.totalUsers).toBe(3);
    });

    it('handles zero transactions gracefully', async () => {
      prisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });
      prisma.walletTransaction.groupBy.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result.totalBalance).toBe(0);
      expect(result.totalCredited).toBe(0);
      expect(result.totalDebited).toBe(0);
      expect(result.totalUsers).toBe(0);
    });
  });
});
