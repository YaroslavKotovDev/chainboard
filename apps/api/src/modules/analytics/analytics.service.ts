import { Injectable } from '@nestjs/common';
import type { AnalyticsSummary, AnalyticsSnapshot, ActivityItem } from '@chainboard/types';

import { AnalyticsRepository } from './analytics.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async getSummary(): Promise<AnalyticsSummary> {
    const metrics = await this.analyticsRepository.getSummaryMetrics();
    const claimSuccessRate =
      metrics.totalClaims > 0
        ? Math.round((metrics.confirmedClaims / metrics.totalClaims) * 100)
        : 0;

    return {
      totalClaims: metrics.totalClaims,
      totalRewards: metrics.activeRewards,
      activeWallets: metrics.activeWallets,
      claimSuccessRate,
      // Period comparison uses 0 deltas — populated by event sync in Phase 14
      periodComparison: {
        claimsDelta: 0,
        walletsDelta: 0,
        successRateDelta: 0,
      },
    };
  }

  async getSnapshots(
    scope: string,
    metric: string,
    from: string,
    to: string,
  ): Promise<AnalyticsSnapshot[]> {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 90 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const rows = await this.analyticsRepository.findSnapshotsByScope(
      scope,
      metric,
      fromDate,
      toDate,
    );

    return rows.map((r) => ({
      id: r.id,
      scope: r.scope,
      metric: r.metric,
      value: r.value,
      periodStart: r.periodStart.toISOString(),
      periodEnd: r.periodEnd.toISOString(),
    }));
  }

  async getRecentActivity(): Promise<ActivityItem[]> {
    const items = await this.analyticsRepository.findRecentActivity(30);

    return items.map((item) => ({
      id: item.id,
      type: item.type === 'claim' ? ('CLAIM' as const) : ('TRANSACTION' as const),
      status: item.status,
      walletAddress: item.walletAddress ?? '',
      description: item.type === 'claim'
        ? `Claim ${item.status.toLowerCase()}`
        : `Transaction ${item.status.toLowerCase()}`,
      timestamp: item.createdAt.toISOString(),
      transactionHash: item.txHash ?? null,
    }));
  }
}
