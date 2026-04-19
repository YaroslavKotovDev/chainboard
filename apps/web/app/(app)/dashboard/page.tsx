'use client';

import { useAnalyticsSummary, useRecentActivity } from '@/hooks/use-analytics';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { ClaimsChart } from '@/components/dashboard/claims-chart';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {user?.displayName
            ? `Welcome back, ${user.displayName}.`
            : 'Overview of your Web3 analytics and reward activity.'}
        </p>
      </div>

      {/* KPI cards */}
      <MetricCards summary={summary} isLoading={summaryLoading} />

      {/* Chart + Activity row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Claims line chart — takes 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <ClaimsChart />
        </div>

        {/* Activity feed — takes 1/3 width */}
        <div className="lg:col-span-1">
          <ActivityFeed items={activity} isLoading={activityLoading} />
        </div>
      </div>
    </div>
  );
}
