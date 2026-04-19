'use client';

import { BarChart3, Gift, TrendingUp, Wallet } from 'lucide-react';
import { DataCard } from '@chainboard/ui';
import type { AnalyticsSummary } from '@chainboard/types';

interface MetricCardsProps {
  summary: AnalyticsSummary | undefined;
  isLoading: boolean;
}

function trendProps(
  delta: number,
  active: boolean,
): { trend: { value: number; direction: 'up' | 'down' } } | Record<string, never> {
  if (!active || delta === 0) return {};
  return { trend: { value: Math.abs(delta), direction: delta >= 0 ? 'up' : 'down' } };
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  const pc = summary?.periodComparison ?? { claimsDelta: 0, walletsDelta: 0, successRateDelta: 0 };
  const showTrends = !isLoading && Boolean(summary);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DataCard
        label="Total Claims"
        value={isLoading ? '—' : (summary?.totalClaims ?? 0).toLocaleString()}
        subtitle="All-time claim count"
        {...trendProps(pc.claimsDelta, showTrends)}
        icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
        loading={isLoading}
      />

      <DataCard
        label="Active Rewards"
        value={isLoading ? '—' : (summary?.totalRewards ?? 0).toLocaleString()}
        subtitle="Currently running programs"
        icon={<Gift className="h-5 w-5 text-emerald-500" />}
        loading={isLoading}
      />

      <DataCard
        label="Active Wallets"
        value={isLoading ? '—' : (summary?.activeWallets ?? 0).toLocaleString()}
        subtitle="Verified connected wallets"
        {...trendProps(pc.walletsDelta, showTrends)}
        icon={<Wallet className="h-5 w-5 text-violet-500" />}
        loading={isLoading}
      />

      <DataCard
        label="Success Rate"
        value={isLoading ? '—' : `${summary?.claimSuccessRate ?? 0}%`}
        subtitle="Confirmed / total claims"
        {...trendProps(pc.successRateDelta, showTrends)}
        icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
        loading={isLoading}
      />
    </div>
  );
}
