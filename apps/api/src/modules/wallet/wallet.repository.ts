import { Injectable } from '@nestjs/common';
import type { Transaction, Wallet } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type WalletWithStats = Wallet & { _count: { transactions: number } };

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<WalletWithStats[]> {
    return this.prisma.wallet.findMany({
      where: { userId },
      include: { _count: { select: { transactions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByAddress(
    address: string,
    userId: string,
  ): Promise<(Wallet & { transactions: Transaction[] }) | null> {
    return this.prisma.wallet.findFirst({
      where: { address: address.toLowerCase(), userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async updateLabel(
    address: string,
    userId: string,
    label: string,
  ): Promise<Wallet> {
    return this.prisma.wallet.update({
      where: { address: address.toLowerCase() },
      data: { label },
    });
  }
}
