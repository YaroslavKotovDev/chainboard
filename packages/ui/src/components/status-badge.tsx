import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      status: {
        pending:
          'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25',
        submitted:
          'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/25',
        confirmed:
          'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25',
        failed:
          'bg-red-500/10 text-red-300 ring-1 ring-red-500/25',
        rejected:
          'bg-red-500/10 text-red-300 ring-1 ring-red-500/25',
        claimed:
          'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25',
        expired:
          'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20',
        active:
          'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25',
        paused:
          'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25',
        eligible:
          'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/25',
        default:
          'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20',
      },
    },
    defaultVariants: {
      status: 'default',
    },
  },
);

/** Statuses whose dot should animate (live / in-progress states) */
const PULSING_STATUSES = new Set(['active', 'pending', 'submitted']);

const dotColorMap: Record<string, string> = {
  pending:   'bg-amber-400',
  submitted: 'bg-blue-400',
  confirmed: 'bg-emerald-400',
  failed:    'bg-red-400',
  rejected:  'bg-red-400',
  claimed:   'bg-emerald-400',
  expired:   'bg-zinc-500',
  active:    'bg-emerald-400',
  paused:    'bg-amber-400',
  eligible:  'bg-blue-400',
  default:   'bg-zinc-500',
};

export type StatusValue =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'rejected'
  | 'claimed'
  | 'expired'
  | 'active'
  | 'paused'
  | 'eligible'
  | 'default';

export interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  status: StatusValue;
  showDot?: boolean;
  label?: string;
  className?: string;
}

const statusLabels: Record<StatusValue, string> = {
  pending:   'Pending',
  submitted: 'Submitted',
  confirmed: 'Confirmed',
  failed:    'Failed',
  rejected:  'Rejected',
  claimed:   'Claimed',
  expired:   'Expired',
  active:    'Active',
  paused:    'Paused',
  eligible:  'Eligible',
  default:   'Unknown',
};

export function StatusBadge({
  status,
  showDot = true,
  label,
  className,
}: StatusBadgeProps) {
  const dotColor  = dotColorMap[status] ?? dotColorMap['default'];
  const isPulsing = PULSING_STATUSES.has(status);
  const displayLabel = label ?? statusLabels[status];

  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center" aria-hidden="true">
          {isPulsing && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping',
                dotColor,
              )}
            />
          )}
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotColor)} />
        </span>
      )}
      {displayLabel}
    </span>
  );
}
