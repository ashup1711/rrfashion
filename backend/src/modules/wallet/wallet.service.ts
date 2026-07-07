import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditWalletDto } from './dto/credit-wallet.dto';
import { DebitWalletDto } from './dto/debit-wallet.dto';
import { AdminWalletQueryDto } from './dto/admin-wallet-query.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.prisma.walletTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    return {
      userId,
      balance: result._sum.amount?.toNumber() || 0,
    };
  }

  async getTransactions(userId: string) {
    return this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTransactions(query: AdminWalletQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Record<string, unknown> = {};
    if (query.type) {
      where.type = query.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats() {
    const [creditedResult, debitedResult, totalUsersResult] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: { amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.groupBy({
        by: ['userId'],
      }),
    ]);

    return {
      totalBalance:
        (creditedResult._sum.amount?.toNumber() ?? 0) +
        (debitedResult._sum.amount?.toNumber() ?? 0),
      totalCredited: creditedResult._sum.amount?.toNumber() ?? 0,
      totalDebited: Math.abs(debitedResult._sum.amount?.toNumber() ?? 0),
      totalUsers: totalUsersResult.length,
    };
  }

  async credit(dto: CreditWalletDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentBalance = await this.getBalance(dto.userId);

    return this.prisma.walletTransaction.create({
      data: {
        userId: dto.userId,
        amount: dto.amount,
        type: dto.type,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        balanceAfter: currentBalance.balance + dto.amount,
      },
    });
  }

  async debit(dto: DebitWalletDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    const currentBalance = await this.getBalance(dto.userId);

    if (currentBalance.balance < dto.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    return this.prisma.walletTransaction.create({
      data: {
        userId: dto.userId,
        amount: -dto.amount,
        type: dto.type,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        balanceAfter: currentBalance.balance - dto.amount,
      },
    });
  }
}
