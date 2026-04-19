'use client';

import * as React from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Wallet,
  FileSignature,
  Send,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

export type ClaimStep =
  | 'eligibility'   // Checking eligibility
  | 'confirm'       // User reviews claim details
  | 'signing'       // MetaMask signature in progress
  | 'pending'       // Tx submitted, waiting for confirmation
  | 'success'       // Confirmed on-chain
  | 'error';        // Something went wrong

export interface ClaimFlowDialogProps {
  open: boolean;
  onClose: () => void;
  step: ClaimStep;
  rewardTitle: string;
  rewardAmount?: string;
  walletAddress?: string;
  transactionHash?: string;
  errorMessage?: string;
  onConfirm: () => void;
}

/* ─────────────────────────────────────────────
   Step metadata
   ───────────────────────────────────────────── */

const STEPS: { key: ClaimStep; label: string; Icon: React.ElementType }[] = [
  { key: 'confirm',  label: 'Review',   Icon: Wallet },
  { key: 'signing',  label: 'Sign',     Icon: FileSignature },
  { key: 'pending',  label: 'Submit',   Icon: Send },
  { key: 'success',  label: 'Claimed',  Icon: Sparkles },
];

const ACTIVE_STEP_INDEX: Record<ClaimStep, number> = {
  eligibility: -1,
  confirm:      0,
  signing:      1,
  pending:      2,
  success:      3,
  error:        -1,
};

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

export function ClaimFlowDialog({
  open,
  onClose,
  step,
  rewardTitle,
  rewardAmount,
  walletAddress,
  transactionHash,
  errorMessage,
  onConfirm,
}: ClaimFlowDialogProps) {
  if (!open) return null;

  const activeIdx = ACTIVE_STEP_INDEX[step] ?? 0;
  const explorerUrl = transactionHash
    ? `https://sepolia.basescan.org/tx/${transactionHash}`
    : undefined;

  const isLoading = step === 'eligibility' || step === 'signing' || step === 'pending';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      {/* Panel */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl animate-fade-in-up"
        style={{
          background: 'rgb(17 17 20)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.7), 0 0 80px rgba(59,130,246,0.06)',
        }}
      >
        {/* Top highlight */}
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)' }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Claim Reward</h2>
            <p className="mt-0.5 text-xs text-zinc-500 truncate max-w-xs">{rewardTitle}</p>
          </div>
          {!isLoading && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Progress steps ── */}
        {step !== 'error' && (
          <div className="px-6 pt-5">
            <div className="flex items-center gap-0">
              {STEPS.map((s, idx) => {
                const isDone    = idx < activeIdx;
                const isCurrent = idx === activeIdx;

                return (
                  <React.Fragment key={s.key}>
                    {/* Step node */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                        )}
                        style={{
                          background: isDone
                            ? 'rgba(16,185,129,0.15)'
                            : isCurrent
                            ? 'rgba(59,130,246,0.15)'
                            : 'rgba(255,255,255,0.04)',
                          border: isDone
                            ? '1px solid rgba(16,185,129,0.3)'
                            : isCurrent
                            ? '1px solid rgba(59,130,246,0.4)'
                            : '1px solid rgba(255,255,255,0.06)',
                          color: isDone ? '#34d399' : isCurrent ? '#60a5fa' : '#52525b',
                          boxShadow: isCurrent ? '0 0 12px rgba(59,130,246,0.20)' : 'none',
                        }}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isCurrent && isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <s.Icon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-medium',
                          isDone ? 'text-emerald-400' : isCurrent ? 'text-blue-400' : 'text-zinc-600',
                        )}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Connector line */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className="mx-1 mb-5 h-px flex-1 transition-all duration-500"
                        style={{
                          background: idx < activeIdx
                            ? 'linear-gradient(90deg, rgba(16,185,129,0.4), rgba(16,185,129,0.2))'
                            : 'rgba(255,255,255,0.06)',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step content ── */}
        <div className="px-6 pb-6 pt-5">
          {/* Eligibility check */}
          {step === 'eligibility' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              <p className="text-sm font-medium text-zinc-300">Checking eligibility…</p>
              <p className="text-xs text-zinc-600">Verifying your wallet meets the reward criteria</p>
            </div>
          )}

          {/* Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              {/* Summary card */}
              <div
                className="rounded-lg p-4 space-y-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Reward</span>
                  <span className="font-medium text-zinc-200">{rewardTitle}</span>
                </div>
                {rewardAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Amount</span>
                    <span className="font-mono font-semibold text-emerald-400">{rewardAmount} tokens</span>
                  </div>
                )}
                {walletAddress && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500">Recipient</span>
                    <span className="font-mono text-xs text-zinc-300">
                      {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                    </span>
                  </div>
                )}
                <div
                  className="pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600">Network</span>
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: '#0052ff', boxShadow: '0 0 4px #0052ff' }}
                      />
                      Base Sepolia
                    </span>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <p className="text-xs text-zinc-600 text-center">
                You'll be asked to sign a transaction in your wallet.
              </p>

              {/* CTA */}
              <button
                type="button"
                onClick={onConfirm}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ecfdf5',
                  boxShadow: '0 0 20px rgba(16,185,129,0.25), 0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                Confirm & Sign
              </button>
            </div>
          )}

          {/* Signing */}
          {step === 'signing' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  boxShadow: '0 0 24px rgba(59,130,246,0.15)',
                }}
              >
                <FileSignature className="h-6 w-6 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-200">Waiting for signature</p>
                <p className="mt-1 text-xs text-zinc-500">Check your wallet extension to sign the transaction</p>
              </div>
              {/* Animated dots */}
              <div className="flex items-center gap-1.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending / submitted */}
          {step === 'pending' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                  }}
                >
                  <Send className="h-6 w-6 text-amber-400" />
                </div>
                {/* Spinning ring */}
                <svg
                  className="absolute inset-0 animate-spin"
                  viewBox="0 0 64 64"
                  fill="none"
                  style={{ animationDuration: '2s' }}
                >
                  <circle
                    cx="32" cy="32" r="30"
                    stroke="rgba(245,158,11,0.3)"
                    strokeWidth="2"
                    strokeDasharray="150 40"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-200">Transaction submitted</p>
                <p className="mt-1 text-xs text-zinc-500">Waiting for blockchain confirmation…</p>
              </div>

              {transactionHash && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span className="font-mono">
                    {transactionHash.slice(0, 10)}…{transactionHash.slice(-8)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.35)',
                  boxShadow: '0 0 32px rgba(16,185,129,0.20)',
                  animation: 'glow-pulse 2s ease-in-out infinite',
                }}
              >
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>

              <div className="text-center">
                <p className="text-base font-bold text-zinc-100">Reward Claimed! 🎉</p>
                <p className="mt-1 text-xs text-zinc-500">Your claim has been confirmed on-chain</p>
              </div>

              {transactionHash && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/10"
                  style={{ border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Close
              </button>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                <XCircle className="h-7 w-7 text-red-400" />
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-zinc-200">Transaction failed</p>
                {errorMessage && (
                  <p className="mt-1 text-xs text-zinc-500 max-w-xs">{errorMessage}</p>
                )}
              </div>

              <div className="flex w-full gap-2 mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all hover:scale-[1.01]"
                  style={{
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    color: '#93c5fd',
                  }}
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
