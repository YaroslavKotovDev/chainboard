'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import * as React from 'react';

import { cn } from '../lib/utils';

export interface DataCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon?: React.ReactNode;
  /** Accent color that tints the icon and glow: blue | emerald | amber | red */
  accent?: 'blue' | 'emerald' | 'amber' | 'red';
  loading?: boolean;
  className?: string;
}

const accentConfig = {
  blue: {
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-400',
    glow: '0 0 32px rgba(59, 130, 246, 0.12)',
    glowHover: '0 0 40px rgba(59, 130, 246, 0.22)',
    valueGrad: 'text-blue-100',
  },
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    glow: '0 0 32px rgba(16, 185, 129, 0.12)',
    glowHover: '0 0 40px rgba(16, 185, 129, 0.22)',
    valueGrad: 'text-emerald-100',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-400',
    glow: '0 0 32px rgba(245, 158, 11, 0.12)',
    glowHover: '0 0 40px rgba(245, 158, 11, 0.22)',
    valueGrad: 'text-amber-100',
  },
  red: {
    iconBg: 'bg-red-500/10',
    iconText: 'text-red-400',
    glow: '0 0 32px rgba(239, 68, 68, 0.12)',
    glowHover: '0 0 40px rgba(239, 68, 68, 0.22)',
    valueGrad: 'text-red-100',
  },
};

export function DataCard({
  label,
  value,
  subtitle,
  trend,
  icon,
  accent,
  loading = false,
  className,
}: DataCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const cfg = accent ? accentConfig[accent] : null;

  if (loading) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-xl p-5',
          className,
        )}
        style={{
          background: 'rgb(17 17 20)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <div className="h-3 w-20 rounded-md animate-shimmer" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-8 w-32 rounded-md animate-shimmer" style={{ background: 'rgba(255,255,255,0.06)', animationDelay: '150ms' }} />
          </div>
          <div className="h-10 w-10 rounded-lg animate-shimmer" style={{ background: 'rgba(255,255,255,0.06)', animationDelay: '80ms' }} />
        </div>
        <div className="mt-4 h-3 w-24 rounded-md animate-shimmer" style={{ background: 'rgba(255,255,255,0.06)', animationDelay: '220ms' }} />
      </div>
    );
  }

  const trendIsPositive = trend?.direction === 'up';
  const TrendIcon = trendIsPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl p-5 transition-all duration-300 cursor-default',
        'animate-fade-in-up',
        className,
      )}
      style={{
        background: hovered
          ? 'rgb(21 21 24)'
          : 'rgb(17 17 20)',
        boxShadow: hovered
          ? `0 0 0 1px rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset${cfg ? `, ${cfg.glowHover}` : ''}`
          : `0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.04) inset${cfg ? `, ${cfg.glow}` : ''}`,
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Subtle top-edge highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
          opacity: hovered ? 1 : 0.5,
        }}
      />

      {/* Accent glow blob in corner */}
      {cfg && (
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle, ${
              accent === 'blue' ? 'rgba(59,130,246,0.12)' :
              accent === 'emerald' ? 'rgba(16,185,129,0.12)' :
              accent === 'amber' ? 'rgba(245,158,11,0.12)' :
              'rgba(239,68,68,0.12)'
            }, transparent 70%)`,
            opacity: hovered ? 1 : 0.6,
          }}
        />
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {label}
          </p>
          <p
            className={cn(
              'mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight',
              cfg ? cfg.valueGrad : 'text-zinc-100',
            )}
          >
            {value}
          </p>
        </div>

        {icon && (
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
              cfg ? `${cfg.iconBg} ${cfg.iconText}` : 'bg-white/[0.04] text-zinc-400',
            )}
            style={{
              boxShadow: hovered ? '0 0 0 1px rgba(255,255,255,0.10)' : '0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="relative mt-4 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trendIsPositive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-red-500/10 text-red-400',
              )}
            >
              <TrendIcon className="h-3 w-3" />
              {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-zinc-500">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}
