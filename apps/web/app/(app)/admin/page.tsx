'use client';

import { useState }                              from 'react';
import { Users, Gift, FileCheck, Activity, RefreshCw, Shield } from 'lucide-react';

import { LoadingTable }                          from '@chainboard/ui';
import { useAdminStats, useAdminClaims, useAdminRewards, useUpdateClaimStatus, useUpdateRewardStatus } from '@/hooks/use-admin';
import type { AdminClaim, AdminReward }          from '@/hooks/use-admin';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl p-5" style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
          <p className="mt-2 font-mono text-3xl font-bold text-zinc-100">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      {/* bottom glow */}
      <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full blur-2xl opacity-20" style={{ background: color }} />
    </div>
  );
}

// ─── Claims table ─────────────────────────────────────────────────────────────

const CLAIM_STATUS_COLORS: Record<string, string> = {
  PENDING:   'text-amber-400 bg-amber-400/10',
  SUBMITTED: 'text-blue-400 bg-blue-400/10',
  CONFIRMED: 'text-emerald-400 bg-emerald-400/10',
  FAILED:    'text-red-400 bg-red-400/10',
  REJECTED:  'text-zinc-400 bg-zinc-400/10',
};

function ClaimsTable() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage]                 = useState(1);
  const { data, isLoading }             = useAdminClaims(page, statusFilter || undefined);
  const updateStatus                    = useUpdateClaimStatus();

  const statuses = ['', 'PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'REJECTED'];

  return (
    <div className="rounded-xl" style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <h3 className="text-sm font-semibold text-zinc-300">Claims</h3>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: statusFilter === s ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: statusFilter === s ? '#e4e4e7' : '#71717a',
              }}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4"><LoadingTable rows={5} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Wallet', 'Reward', 'Status', 'TX Hash', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data.map((claim: AdminClaim) => (
                <tr key={claim.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-zinc-400">
                      {claim.walletAddress.slice(0, 8)}…{claim.walletAddress.slice(-4)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-zinc-300">{claim.rewardTitle}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${CLAIM_STATUS_COLORS[claim.status] ?? 'text-zinc-400 bg-zinc-400/10'}`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {claim.transactionHash ? (
                      <span className="font-mono text-xs text-zinc-500">
                        {claim.transactionHash.slice(0, 10)}…
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-zinc-600">
                      {new Date(claim.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {claim.status === 'PENDING' && (
                      <button
                        onClick={() => void updateStatus.mutateAsync({ id: claim.id, status: 'REJECTED' })}
                        disabled={updateStatus.isPending}
                        className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.meta.pages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
          <span className="text-xs text-zinc-600">
            {data.meta.total} total · page {page} of {data.meta.pages}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg px-3 py-1 text-xs text-zinc-400 hover:bg-white/5 disabled:opacity-30 transition-colors">
              Prev
            </button>
            <button onClick={() => setPage((p) => Math.min(data.meta.pages, p + 1))} disabled={page === data.meta.pages}
              className="rounded-lg px-3 py-1 text-xs text-zinc-400 hover:bg-white/5 disabled:opacity-30 transition-colors">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rewards table ────────────────────────────────────────────────────────────

const REWARD_STATUS_COLORS: Record<string, string> = {
  ACTIVE:  'text-emerald-400 bg-emerald-400/10',
  PAUSED:  'text-amber-400 bg-amber-400/10',
  EXPIRED: 'text-zinc-400 bg-zinc-400/10',
};

function RewardsTable() {
  const { data: rewards, isLoading } = useAdminRewards();
  const updateStatus                 = useUpdateRewardStatus();

  return (
    <div className="rounded-xl" style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
      <div className="border-b border-white/5 px-5 py-4">
        <h3 className="text-sm font-semibold text-zinc-300">Reward Programs</h3>
      </div>

      {isLoading ? (
        <div className="p-4"><LoadingTable rows={3} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {['Title', 'Status', 'Total / Claimed', 'Claims', 'Period', 'Actions'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rewards?.map((reward: AdminReward) => (
                <tr key={reward.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium text-zinc-200">{reward.title}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${REWARD_STATUS_COLORS[reward.status] ?? 'text-zinc-400 bg-zinc-400/10'}`}>
                      {reward.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-mono text-xs">
                      <span className="text-zinc-300">{reward.totalAmount}</span>
                      <span className="text-zinc-700"> / {reward.claimedAmount}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-zinc-400">{reward.claimCount}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-zinc-600">
                      {new Date(reward.startAt).toLocaleDateString()} — {new Date(reward.endAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-5 py-3 flex gap-1">
                    {reward.status === 'ACTIVE' && (
                      <button
                        onClick={() => void updateStatus.mutateAsync({ id: reward.id, status: 'PAUSED' })}
                        disabled={updateStatus.isPending}
                        className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-400/10 transition-colors disabled:opacity-40"
                      >
                        Pause
                      </button>
                    )}
                    {reward.status === 'PAUSED' && (
                      <button
                        onClick={() => void updateStatus.mutateAsync({ id: reward.id, status: 'ACTIVE' })}
                        disabled={updateStatus.isPending}
                        className="rounded-lg px-2.5 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-40"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: stats, isLoading: statsLoading, refetch } = useAdminStats();

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-400" />
            <h2 className="text-2xl font-bold text-zinc-100">Admin</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Platform management and oversight.</p>
        </div>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Users}     label="Users"       value={stats?.users.total ?? 0}           sub={`${stats?.users.withWallets ?? 0} with wallets`} color="#3b82f6" />
          <StatCard icon={Gift}      label="Programs"    value={stats?.rewards.total ?? 0}          color="#10b981" />
          <StatCard icon={FileCheck} label="Claims"      value={stats?.claims.total ?? 0}           sub={`${stats?.claims.pending ?? 0} pending`}        color="#f59e0b" />
          <StatCard icon={Activity}  label="Tx Count"    value={stats?.transactions.total ?? 0}     color="#8b5cf6" />
        </div>
      )}

      {/* Tables */}
      <ClaimsTable />
      <RewardsTable />
    </div>
  );
}
