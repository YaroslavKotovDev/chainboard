'use client';

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsSummary, AnalyticsSnapshot, ActivityItem } from '@chainboard/types';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

// ─── Query key factory ────────────────────────────────────────────────────────

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  snapshots: (scope: string, metric: string, from: string, to: string) =>
    [...analyticsKeys.all, 'snapshots', scope, metric, from, to] as const,
  activity: () => [...analyticsKeys.all, 'activity'] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAnalyticsSummary() {
  const { getToken } = useAuth();

  return useQuery<AnalyticsSummary>({
    queryKey: analyticsKeys.summary(),
    queryFn: () => {
      const token = getToken();
      return apiClient.get<AnalyticsSummary>('/analytics/summary', token ?? undefined);
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAnalyticsSnapshots(
  scope: string,
  metric: string,
  from: string,
  to: string,
) {
  const { getToken } = useAuth();

  return useQuery<AnalyticsSnapshot[]>({
    queryKey: analyticsKeys.snapshots(scope, metric, from, to),
    queryFn: () => {
      const token = getToken();
      const params = new URLSearchParams({ scope, metric, from, to });
      return apiClient.get<AnalyticsSnapshot[]>(`/analytics/snapshots?${params}`, token ?? undefined);
    },
    enabled: Boolean(from && to),
    staleTime: 5 * 60 * 1000, // 5 minutes — historical data rarely changes
  });
}

export function useRecentActivity() {
  const { getToken } = useAuth();

  return useQuery<ActivityItem[]>({
    queryKey: analyticsKeys.activity(),
    queryFn: () => {
      const token = getToken();
      return apiClient.get<ActivityItem[]>('/analytics/activity', token ?? undefined);
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // poll every minute for live feel
  });
}
