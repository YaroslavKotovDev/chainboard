'use client';

import { useState } from 'react';
import { Check, ExternalLink, Pencil, ShieldCheck, X } from 'lucide-react';
import type { WalletRecord } from '@chainboard/types';
import { WalletAddress } from '@chainboard/ui';
import { useWallets, useSetWalletLabel } from '@/hooks/use-wallets';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAIN_NAMES: Record<number, string> = {
  1:     'Ethereum',
  8453:  'Base',
  84532: 'Base Sepolia',
  137:   'Polygon',
  10:    'Optimism',
};

const EXPLORER_BASE: Record<number, string> = {
  1:     'https://etherscan.io/address/',
  8453:  'https://basescan.org/address/',
  84532: 'https://sepolia.basescan.org/address/',
  137:   'https://polygonscan.com/address/',
  10:    'https://optimistic.etherscan.io/address/',
};

// ─── Label editor ─────────────────────────────────────────────────────────────

interface LabelCellProps {
  wallet: WalletRecord;
}

function LabelCell({ wallet }: LabelCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(wallet.label ?? '');
  const { mutate: setLabel, isPending } = useSetWalletLabel();

  function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === wallet.label) {
      setEditing(false);
      setDraft(wallet.label ?? '');
      return;
    }
    setLabel(
      { address: wallet.address, label: trimmed },
      { onSettled: () => setEditing(false) },
    );
  }

  function handleCancel() {
    setEditing(false);
    setDraft(wallet.label ?? '');
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          maxLength={32}
          disabled={isPending}
          className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-white outline-none focus:border-blue-500 disabled:opacity-50"
          style={{ width: '9rem' }}
        />
        <button
          onClick={handleSave}
          disabled={isPending}
          className="rounded p-1 text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-40"
          aria-label="Save label"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCancel}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-700"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-1.5">
      {wallet.label ? (
        <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
          {wallet.label}
        </span>
      ) : (
        <span className="text-xs italic text-zinc-600">no label</span>
      )}
      <button
        onClick={() => {
          setDraft(wallet.label ?? '');
          setEditing(true);
        }}
        className="rounded p-0.5 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-300"
        aria-label="Edit label"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg px-5 py-4"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
          <div className="ml-auto h-4 w-10 animate-pulse rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyWallets() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
        <ShieldCheck className="h-6 w-6 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-300">No wallets connected</p>
      <p className="mt-1.5 text-xs text-zinc-500">
        Sign in with a wallet to see it appear here.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WalletsPage() {
  const { data: wallets, isLoading } = useWallets();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Wallets</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Connected wallets and their on-chain transaction history.
          </p>
        </div>
        {!isLoading && wallets && wallets.length > 0 && (
          <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm font-medium text-zinc-300">
            {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Wallets table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        {/* Table header */}
        <div className="grid border-b border-zinc-800 px-5 py-3"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}
        >
          {['Address', 'Label', 'Network', 'Transactions', ''].map((col) => (
            <span key={col} className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {isLoading ? (
          <TableSkeleton />
        ) : !wallets || wallets.length === 0 ? (
          <EmptyWallets />
        ) : (
          <ul className="divide-y divide-zinc-800/60">
            {wallets.map((wallet) => {
              const chainName = CHAIN_NAMES[wallet.chainId] ?? `Chain ${wallet.chainId}`;
              const explorerBase = EXPLORER_BASE[wallet.chainId];

              return (
                <li key={wallet.id}>
                  <div
                    className="grid items-center px-5 py-4 transition-colors hover:bg-zinc-800/40"
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}
                  >
                    {/* Address */}
                    <div className="flex items-center gap-2">
                      {wallet.isVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                      )}
                      <WalletAddress address={wallet.address} showCopy />
                    </div>

                    {/* Label */}
                    <LabelCell wallet={wallet} />

                    {/* Network */}
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span className="text-xs text-zinc-300">{chainName}</span>
                    </div>

                    {/* Tx count */}
                    <span className="text-sm font-medium tabular-nums text-zinc-200">
                      {wallet.transactionCount.toLocaleString()}
                    </span>

                    {/* Explorer link */}
                    <div>
                      {explorerBase && (
                        <a
                          href={`${explorerBase}${wallet.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
                          aria-label="View on explorer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer note */}
      {!isLoading && wallets && wallets.length > 0 && (
        <p className="text-xs text-zinc-600">
          Transaction counts are synced from on-chain events. Labels are stored off-chain and only visible to you.
        </p>
      )}
    </div>
  );
}
