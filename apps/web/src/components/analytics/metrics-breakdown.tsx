'use client';

import { useEffect, useRef } from 'react';
import type * as EChartsType from 'echarts';
import { useRecentActivity } from '@/hooks/use-analytics';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#10b981',
  PENDING:   '#3b82f6',
  SUBMITTED: '#6366f1',
  FAILED:    '#ef4444',
  REJECTED:  '#f97316',
  EXPIRED:   '#78716c',
};

function aggregateByStatus(
  items: Array<{ status: string; type: string }>,
): { statuses: string[]; claimData: number[]; txData: number[] } {
  const statusSet = new Set(Object.keys(STATUS_COLORS));
  const claimMap: Record<string, number> = {};
  const txMap: Record<string, number> = {};

  for (const item of items) {
    const s = item.status.toUpperCase();
    statusSet.add(s);
    if (item.type === 'CLAIM') {
      claimMap[s] = (claimMap[s] ?? 0) + 1;
    } else {
      txMap[s] = (txMap[s] ?? 0) + 1;
    }
  }

  const statuses = [...statusSet].filter((s) => (claimMap[s] ?? 0) + (txMap[s] ?? 0) > 0);

  return {
    statuses,
    claimData: statuses.map((s) => claimMap[s] ?? 0),
    txData: statuses.map((s) => txMap[s] ?? 0),
  };
}

function buildOption(
  statuses: string[],
  claimData: number[],
  txData: number[],
): EChartsType.EChartsOption {
  return {
    backgroundColor: 'transparent',
    grid: { top: 16, right: 20, bottom: 32, left: 60 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      borderWidth: 1,
      textStyle: { color: '#e4e4e7', fontSize: 12 },
    },
    legend: {
      data: ['Claims', 'Transactions'],
      textStyle: { color: '#71717a', fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
      right: 0,
      top: 0,
    },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#71717a', fontSize: 11 },
      splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      minInterval: 1,
    },
    yAxis: {
      type: 'category',
      data: statuses,
      axisLine: { lineStyle: { color: '#3f3f46' } },
      axisLabel: { color: '#a1a1aa', fontSize: 11 },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Claims',
        type: 'bar',
        stack: 'total',
        data: claimData,
        barMaxWidth: 24,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 0, 0, 0] },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: unknown) => {
            const param = p as { value: number };
            return param.value > 0 ? String(param.value) : '';
          },
          fontSize: 10,
          color: '#fff',
        },
      },
      {
        name: 'Transactions',
        type: 'bar',
        stack: 'total',
        data: txData,
        barMaxWidth: 24,
        itemStyle: { color: '#10b981', borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: 'inside',
          formatter: (p: unknown) => {
            const param = p as { value: number };
            return param.value > 0 ? String(param.value) : '';
          },
          fontSize: 10,
          color: '#fff',
        },
      },
    ],
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BreakdownSkeleton() {
  return (
    <div className="space-y-3 px-4 pt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-20 animate-pulse rounded bg-zinc-800 text-right text-xs text-transparent">
            STATUS
          </div>
          <div
            className="h-6 animate-pulse rounded bg-zinc-800"
            style={{ width: `${30 + i * 12}%`, animationDelay: `${i * 50}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MetricsBreakdown() {
  const { data: activity, isLoading } = useRecentActivity();

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current || isLoading || !activity) return;

    let chart: EChartsType.ECharts;

    const { statuses, claimData, txData } = aggregateByStatus(activity);

    import('echarts').then((echarts) => {
      if (!containerRef.current) return;
      chart = echarts.init(containerRef.current, null, { renderer: 'canvas' });
      chartRef.current = chart;

      if (statuses.length > 0) {
        chart.setOption(buildOption(statuses, claimData, txData));
      }
    });

    return () => {
      chart?.dispose();
      chartRef.current = null;
    };
  }, [isLoading, activity]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const hasData = activity && activity.length > 0;

  // Build status summary for the legend
  const statusSummary = hasData
    ? [...new Set(activity.map((a) => a.status.toUpperCase()))].map((s) => ({
        status: s,
        color: STATUS_COLORS[s] ?? '#71717a',
        count: activity.filter((a) => a.status.toUpperCase() === s).length,
      }))
    : [];

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Outcome Breakdown</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Claims and transactions by status</p>
        </div>

        {/* Status legend pills */}
        {!isLoading && statusSummary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {statusSummary.map(({ status, color, count }) => (
              <span
                key={status}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: `${color}18`, color }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: color }}
                />
                {status} · {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="h-56 px-2 py-3">
        {isLoading ? (
          <BreakdownSkeleton />
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">No activity data available</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
