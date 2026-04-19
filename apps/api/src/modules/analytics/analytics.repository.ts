import { Injectable } from '@nestjs/common';
import type { AnalyticsSnapshot, Claim, Transaction } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export interface RecentActivityItem {
  type: 'claim' | 'transaction';
  id: string;
  status: string;
  createdAt: Date;
  walletAddress?: string;
  txHash?: string;
  chainId?: number;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSummaryMetrics(): Promise<{
    totalClaims: number;
    confirmedClaims: number;
    activeWallets: number;
    activeRewards: number;
  }> {
    const [totalClaims, confirmedClaims, activeWallets, activeRewards] = await Promise.all([
      this.prisma.claim.count(),
      this.prisma.claim.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.wallet.count({ where: { isVerified: true } }),
      this.prisma.reward.count({ where: { status: 'ACTIVE' } }),
    ]);

    return { totalClaims, confirmedClaims, activeWallets, activeRewards };
  }

  async findSnapshotsByScope(
    scope: string,
    metric: string,
    from: Date,
    to: Date,
  ): Promise<AnalyticsSnapshot[]> {
    return this.prisma.analyticsSnapshot.findMany({
      where: {
        scope: scope as 'DAILY' | 'WEEKLY' | 'MONTHLY',
        metric,
        periodStart: { gte: from },
        periodEnd: { lte: to },
      },
      orderBy: { periodStart: 'asc' },
    });
  }

  async findRecentActivity(limit = 20): Promise<RecentActivityItem[]> {
    const [claims, transactions] = await Promise.all([
      this.prisma.claim.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { wallet: { select: { address: true } } },
      }),
      this.prisma.transaction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { wallet: { select: { address: true } } },
      }),
    ]);

    const claimItems: RecentActivityItem[] = claims.map((c) => ({
      type: 'claim' as const,
      id: c.id,
      status: c.status,
      createdAt: c.createdAt,
      walletAddress: c.wallet.address,
    }));

    const txItems: RecentActivityItem[] = transactions.map((t) => ({
      type: 'transaction' as const,
      id: t.id,
      status: t.status,
      createdAt: t.createdAt,
      walletAddress: t.wallet.address,
      txHash: t.hash,
      chainId: t.chainId,
    }));

    return [...claimItems, ...txItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
