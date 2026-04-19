'use client';

import { useEffect, useRef, useState } from 'react';
import type * as EChartsType from 'echarts';
import type { AnalyticsSnapshot, SnapshotScope } from '@chainboard/types';
import { useAnalyticsSnapshots } from '@/hooks/use-analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type MetricOption = { value: string; label: string; color: string };

const METRICS: MetricOption[] = [
  { value: 'claims_count', label: 'Claims', color: '#3b82f6' },
  { value: 'success_rate', label: 'Success Rate', color: '#10b981' },
  { value: 'active_wallets', label: 'Active Wallets', color: '#a78bfa' },
];

const SCOPES: { value: SnapshotScope; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10) + 'T00:00:00Z';
}

function getRange(scope: SnapshotScope): { from: string; to: string } {
  const to = new Date();
  const days = scope === 'DAILY' ? 30 : scope === 'WEEKLY' ? 84 : 365;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function formatLabel(isoString: string, scope: SnapshotScope): string {
  const d = new Date(isoString);
  if (scope === 'MONTHLY') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Chart builder ────────────────────────────────────────────────────────────

function buildOption(
  snapshots: AnalyticsSnapshot[],
  scope: SnapshotScope,
  color: string,
  metric: string,
): EChartsType.EChartsOption {
  const labels = snapshots.map((s) => formatLabel(s.periodStart, scope));
  const values = snapshots.map((s) => Number(s.value));
  const unit = metric === 'success_rate' ? '%' : '';

  return {
    backgroundColor: 'transparent',
    grid: { top: 20, right: 20, bottom: 36, left: 52 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      borderWidth: 1,
      textStyle: { color: '#e4e4e7', fontSize: 12 },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        if (!p) return '';
        return `<span style="color:#71717a;font-size:11px">${p.name}</span><br/><span style="color:#fff;font-weight:600">${p.value}${unit}</span>`;
      },
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#3f3f46' } },
      axisLabel: {
        color: '#71717a',
        fontSize: 11,
        interval: Math.max(0, Math.floor(labels.length / 7) - 1),
      },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#71717a',
        fontSize: 11,
        formatter: (v: number) => `${v}${unit}`,
      },
      splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      ...(metric !== 'success_rate' ? { minInterval: 1 } : {}),
      ...(metric === 'success_rate' ? { max: 100 } : {}),
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 0,
        emphasis: { scale: true },
        lineStyle: { color, width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color.replace(')', ', 0.2)').replace('rgb', 'rgba') },
              { offset: 1, color: color.replace(')', ', 0)').replace('rgb', 'rgba') },
            ],
          },
        },
      },
    ],
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex h-full items-end gap-1 px-6 pb-6">
      {Array.from({ length: 20 }).map((_, i) => {
        const h = 15 + Math.sin(i / 2.5) * 35 + (i % 3) * 8;
        return (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-zinc-800"
            style={{ height: `${h}%`, animationDelay: `${i * 30}ms` }}
          />
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SnapshotChart() {
  const [scope, setScope] = useState<SnapshotScope>('DAILY');
  const [metric, setMetric] = useState<MetricOption>(METRICS[0]!);

  const { from, to } = getRange(scope);
  const { data: snapshots, isLoading } = useAnalyticsSnapshots(scope, metric.value, from, to);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current || isLoading) return;

    let chart: EChartsType.ECharts;

    import('echarts').then((echarts) => {
      if (!containerRef.current) return;
      chart = echarts.init(containerRef.current, null, { renderer: 'canvas' });
      chartRef.current = chart;

      const data = snapshots ?? [];
      if (data.length > 0) {
        chart.setOption(buildOption(data, scope, metric.color, metric.value));
      }
    });

    return () => {
      chart?.dispose();
      chartRef.current = null;
    };
  }, [isLoading, snapshots, scope, metric]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const hasData = snapshots && snapshots.length > 0;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Trend Analysis</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Historical data by scope and metric</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Metric selector */}
          <div className="flex rounded-lg border border-zinc-700/60 bg-zinc-800/50 p-0.5">
            {METRICS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMetric(m)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  metric.value === m.value
                    ? 'bg-zinc-700 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Scope selector */}
          <div className="flex rounded-lg border border-zinc-700/60 bg-zinc-800/50 p-0.5">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                onClick={() => setScope(s.value)}
                className={[
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  scope === s.value
                    ? 'bg-zinc-700 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200',
                ].join(' ')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="h-72 px-2 py-3">
        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">No data for selected range</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
