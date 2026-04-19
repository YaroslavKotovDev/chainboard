'use client';

import { useEffect, useRef } from 'react';
import type * as EChartsType from 'echarts';
import type { AnalyticsSnapshot } from '@chainboard/types';
import { useAnalyticsSnapshots } from '@/hooks/use-analytics';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10) + 'T00:00:00Z';
}

function getLast30DaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function formatChartDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── ECharts option builder ───────────────────────────────────────────────────

function buildChartOption(
  snapshots: AnalyticsSnapshot[],
): EChartsType.EChartsOption {
  const dates = snapshots.map((s) => formatChartDate(s.periodStart));
  const values = snapshots.map((s) => Number(s.value));

  return {
    backgroundColor: 'transparent',
    grid: { top: 16, right: 16, bottom: 32, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#18181b',
      borderColor: '#3f3f46',
      borderWidth: 1,
      textStyle: { color: '#e4e4e7', fontSize: 12 },
      formatter: (params: unknown) => {
        const p = (params as Array<{ name: string; value: number }>)[0];
        if (!p) return '';
        return `<span style="color:#71717a;font-size:11px">${p.name}</span><br/><span style="color:#fff;font-weight:600">${p.value} claims</span>`;
      },
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#3f3f46' } },
      axisLabel: {
        color: '#71717a',
        fontSize: 11,
        interval: Math.max(0, Math.floor(dates.length / 6) - 1),
      },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#71717a', fontSize: 11 },
      splitLine: { lineStyle: { color: '#27272a', type: 'dashed' } },
      minInterval: 1,
    },
    series: [
      {
        name: 'Claims',
        type: 'line',
        data: values,
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 0,
        emphasis: { scale: true },
        lineStyle: { color: '#3b82f6', width: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59,130,246,0.2)' },
              { offset: 1, color: 'rgba(59,130,246,0)' },
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
    <div className="flex h-full items-end gap-px px-4 pb-4 pt-2">
      {Array.from({ length: 28 }).map((_, i) => {
        const height = 20 + Math.sin(i / 3) * 30 + Math.random() * 20;
        return (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-zinc-800"
            style={{ height: `${height}%`, animationDelay: `${i * 20}ms` }}
          />
        );
      })}
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────────────────────

export function ClaimsChart() {
  const { from, to } = getLast30DaysRange();
  const { data: snapshots, isLoading } = useAnalyticsSnapshots('DAILY', 'claims_count', from, to);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType.ECharts | null>(null);

  // Init + destroy
  useEffect(() => {
    if (!containerRef.current || isLoading) return;

    let chart: EChartsType.ECharts;

    // Lazy-load echarts to keep initial bundle small
    import('echarts').then((echarts) => {
      if (!containerRef.current) return;
      chart = echarts.init(containerRef.current, null, { renderer: 'canvas' });
      chartRef.current = chart;

      const data = snapshots ?? [];
      if (data.length > 0) {
        chart.setOption(buildChartOption(data));
      }
    });

    return () => {
      chart?.dispose();
      chartRef.current = null;
    };
  }, [isLoading, snapshots]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const hasData = snapshots && snapshots.length > 0;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Claims Activity</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Daily claims — last 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-xs text-zinc-400">claims_count</span>
        </div>
      </div>

      {/* Chart area */}
      <div className="h-64 px-2 py-3">
        {isLoading ? (
          <ChartSkeleton />
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500">No snapshot data available</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
