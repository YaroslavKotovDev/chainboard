'use client';

import { useAnalyticsSummary } from '@/hooks/use-analytics';
import { SnapshotChart } from '@/components/analytics/snapshot-chart';
import { MetricsBreakdown } from '@/components/analytics/metrics-breakdown';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useRecentActivity } from '@/hooks/use-analytics';

// ─── Summary stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  isLoading?: boolean;
  accentColor?: string;
}

function StatCard({ label, value, sub, isLoading, accentColor = '#3b82f6' }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      {isLoading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-zinc-800" />
      ) : (
        <p className="text-2xl font-bold text-white" style={{ color: accentColor }}>
          {value}
        </p>
      )}
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Deep-dive into claims, volumes, and on-chain activity.
        </p>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Claims"
          value={summary?.totalClaims ?? '—'}
          sub="all time"
          isLoading={summaryLoading}
          accentColor="#3b82f6"
        />
        <StatCard
          label="Active Rewards"
          value={summary?.totalRewards ?? '—'}
          sub="currently live"
          isLoading={summaryLoading}
          accentColor="#10b981"
        />
        <StatCard
          label="Active Wallets"
          value={summary?.activeWallets ?? '—'}
          sub="with activity"
          isLoading={summaryLoading}
          accentColor="#a78bfa"
        />
        <StatCard
          label="Success Rate"
          value={summary ? `${summary.claimSuccessRate.toFixed(1)}%` : '—'}
          sub="confirmed claims"
          isLoading={summaryLoading}
          accentColor="#f59e0b"
        />
      </div>

      {/* Main trend chart */}
      <SnapshotChart />

      {/* Breakdown + activity grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <MetricsBreakdown />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed items={activity} isLoading={activityLoading} />
        </div>
      </div>
    </div>
  );
}
