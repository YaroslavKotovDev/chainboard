'use client';

import { Calendar, Coins, Users, ChevronRight, CheckCircle2, Clock, Zap } from 'lucide-react';
import * as React from 'react';
import type { RewardSummary } from '@chainboard/types';
import { StatusBadge } from '@chainboard/ui';
import type { StatusValue } from '@chainboard/ui';
import { cn } from '@/lib/utils';

interface RewardCardProps {
  reward: RewardSummary;
  onClaim: (rewardId: string) => void;
  isClaimLoading?: boolean;
  className?: string;
}

function formatAmount(amount: string): string {
  const n = parseFloat(amount);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function claimStatusToStatusValue(status: RewardSummary['userClaimStatus'] | null): StatusValue {
  if (!status) return 'default';
  const map: Record<string, StatusValue> = {
    PENDING:   'pending',
    SUBMITTED: 'submitted',
    CONFIRMED: 'claimed',
    FAILED:    'failed',
    REJECTED:  'rejected',
  };
  return map[status] ?? 'default';
}

function progressPercent(claimed: string, total: string): number {
  const c = parseFloat(claimed);
  const t = parseFloat(total);
  if (!t) return 0;
  return Math.min(100, Math.round((c / t) * 100));
}

export function RewardCard({ reward, onClaim, isClaimLoading = false, className }: RewardCardProps) {
  const [hovered, setHovered] = React.useState(false);
  const isEligible    = reward.isEligible && reward.status === 'ACTIVE' && !reward.userClaimStatus;
  const isClaimed     = reward.userClaimStatus === 'CONFIRMED';
  const isPending     = reward.userClaimStatus === 'PENDING' || reward.userClaimStatus === 'SUBMITTED';
  const progress      = progressPercent(reward.claimedAmount, reward.totalAmount);

  // Border treatment
  const borderStyle = isEligible
    ? 'border-emerald-500/30'
    : isClaimed
    ? 'border-white/[0.06]'
    : 'border-white/[0.06]';

  const badgeStatus: StatusValue = isEligible
    ? 'eligible'
    : reward.status === 'ACTIVE'
    ? 'active'
    : reward.status === 'PAUSED'
    ? 'paused'
    : 'expired';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border transition-all duration-300',
        borderStyle,
        isEligible && 'gradient-border-eligible',
        className,
      )}
      style={{
        background: hovered ? 'rgb(21 21 24)' : 'rgb(17 17 20)',
        boxShadow: isEligible && hovered
          ? '0 0 0 1px rgba(16,185,129,0.25), 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(16,185,129,0.08)'
          : isEligible
          ? '0 0 0 1px rgba(16,185,129,0.15), 0 4px 20px rgba(0,0,0,0.4), 0 0 16px rgba(16,185,129,0.06)'
          : hovered
          ? '0 0 0 1px rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 0 0 1px rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top highlight edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isEligible
            ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), rgba(59,130,246,0.3), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        }}
      />

      {/* Eligible glow blob */}
      {isEligible && (
        <div
          className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full transition-opacity duration-500"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)',
            opacity: hovered ? 1 : 0.5,
          }}
        />
      )}

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Icon */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: isEligible
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {isClaimed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : isEligible ? (
                <Zap className="h-5 w-5 text-emerald-400" />
              ) : (
                <Coins className="h-5 w-5 text-zinc-500" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-zinc-100 leading-tight">
                {reward.title}
              </h3>
              {reward.description && (
                <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{reward.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge
              status={badgeStatus}
              label={
                isEligible ? 'Eligible' :
                reward.status === 'ACTIVE' ? 'Active' :
                reward.status === 'PAUSED' ? 'Paused' : 'Expired'
              }
            />
          </div>
        </div>

        {/* Amount */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-600">
              Total Pool
            </p>
            <p
              className="mt-0.5 font-mono text-2xl font-bold tabular-nums"
              style={{ color: isEligible ? '#34d399' : '#e4e4e7' }}
            >
              {formatAmount(reward.totalAmount)}
              <span className="ml-1 text-sm font-medium text-zinc-500">tokens</span>
            </p>
          </div>

          {/* User claim badge if already claimed/pending */}
          {reward.userClaimStatus && (
            <StatusBadge status={claimStatusToStatusValue(reward.userClaimStatus)} />
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-zinc-600 mb-1.5">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Claimed
            </span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div
            className="h-1 w-full overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: isEligible
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              }}
            />
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <Calendar className="h-3 w-3" />
            <span>Ends {formatDate(reward.endAt)}</span>
          </div>

          {/* CTA */}
          {isEligible && (
            <button
              type="button"
              onClick={() => onClaim(reward.id)}
              disabled={isClaimLoading}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold',
                'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                isClaimLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]',
              )}
              style={{
                background: isClaimLoading
                  ? 'rgba(16,185,129,0.12)'
                  : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                color: '#ecfdf5',
                boxShadow: isClaimLoading ? 'none' : '0 0 16px rgba(16,185,129,0.25), 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {isClaimLoading ? (
                <>
                  <Clock className="h-3.5 w-3.5 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  Claim Reward
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}

          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <Clock className="h-3.5 w-3.5 animate-pulse" />
              Claim in progress
            </span>
          )}

          {isClaimed && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Claimed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
