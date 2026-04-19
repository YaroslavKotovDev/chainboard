'use client';

import { ArrowUpRight, Clock } from 'lucide-react';
import type { ActivityItem } from '@chainboard/types';
import { StatusBadge } from '@chainboard/ui';
import { formatWalletAddress } from '@chainboard/utils';

interface ActivityFeedProps {
  items: ActivityItem[] | undefined;
  isLoading: boolean;
}

function relativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg p-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-3/5 animate-pulse rounded bg-zinc-800" />
            <div className="h-2.5 w-2/5 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="h-5 w-14 animate-pulse rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyActivity() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
        <Clock className="h-5 w-5 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-300">No recent activity</p>
      <p className="mt-1 text-xs text-zinc-500">
        On-chain events and claims will appear here.
      </p>
    </div>
  );
}

export function ActivityFeed({ items, isLoading }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <p className="mt-0.5 text-xs text-zinc-500">Live on-chain and claim events</p>
        </div>
        {!isLoading && items && items.length > 0 && (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
            {items.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {isLoading ? (
          <ActivitySkeleton />
        ) : !items || items.length === 0 ? (
          <EmptyActivity />
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800/60">
                  {/* Type icon */}
                  <div
                    className={[
                      'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
                      item.type === 'CLAIM'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-emerald-500/10 text-emerald-400',
                    ].join(' ')}
                  >
                    {item.type === 'CLAIM' ? (
                      <Clock className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Description + address */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {item.description}
                    </p>
                    <p className="font-mono text-xs text-zinc-500">
                      {formatWalletAddress(item.walletAddress)}
                    </p>
                  </div>

                  {/* Status + time */}
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <StatusBadge status={item.status as Parameters<typeof StatusBadge>[0]['status']} />
                    <span className="text-xs text-zinc-600">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
