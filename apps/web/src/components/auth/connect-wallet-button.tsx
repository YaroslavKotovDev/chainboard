'use client';

import { Loader2, LogOut, Wallet, ExternalLink, AlertCircle, ArrowRight } from 'lucide-react';
import { WalletAddress } from '@chainboard/ui';
import { useWalletAuth, hasWalletProvider } from '@/hooks/use-wallet-auth';
import { useAuth } from '@/providers/auth-provider';
import { useWagmiReady } from '@/providers/web3-provider';

// ─── No wallet installed ──────────────────────────────────────────────────────

function NoWalletInstalled() {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl p-4 w-full"
      style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)' }}
        >
          <AlertCircle className="h-4 w-4 text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">No wallet detected</p>
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
            Install a browser wallet extension to connect.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
            boxShadow: '0 0 16px rgba(249,115,22,0.25)',
          }}
        >
          <Wallet className="h-4 w-4" />
          Install MetaMask
          <ExternalLink className="h-3 w-3 opacity-70" />
        </a>
        <p className="text-center text-[11px] text-zinc-600">
          After installing, refresh the page and try again.
        </p>
      </div>
    </div>
  );
}

// ─── Main inner component ─────────────────────────────────────────────────────

/**
 * Inner component — only rendered when WagmiProvider is confirmed in the tree.
 */
function WalletButtonInner() {
  const { step, error, connect, disconnect } = useWalletAuth();
  const { isAuthenticated, user } = useAuth();

  const isLoading = step === 'connecting' || step === 'signing' || step === 'verifying';
  const noWallet  = step === 'error' && error === 'no_wallet';

  if (noWallet) return <NoWalletInstalled />;

  // ── Authenticated state ──────────────────────────────────────────────────
  if (isAuthenticated && user) {
    return (
      <div className="flex flex-col items-center gap-3 w-full">
        <div
          className="flex w-full items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <WalletAddress address={user.address} showCopy />
          </div>
          <button
            onClick={() => void disconnect()}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-200 hover:bg-white/5"
            aria-label="Disconnect wallet"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
        <p className="text-xs text-zinc-500">Redirecting to dashboard…</p>
      </div>
    );
  }

  // ── Sign In step label ────────────────────────────────────────────────────
  let label = 'Connect Wallet';
  if (step === 'connecting') label = 'Connecting…';
  if (step === 'signing')    label = 'Sign in wallet…';
  if (step === 'verifying')  label = 'Verifying…';
  if (step === 'error')      label = 'Try Again';

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <button
        onClick={() => void connect()}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: isLoading
            ? 'rgba(59,130,246,0.15)'
            : 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
          boxShadow: isLoading
            ? 'none'
            : '0 0 20px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {isLoading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : step === 'error'
            ? <AlertCircle className="h-4 w-4 text-red-300" />
            : <Wallet className="h-4 w-4" />
        }
        {label}
        {!isLoading && step !== 'error' && <ArrowRight className="h-4 w-4 opacity-60" />}
      </button>

      {step === 'signing' && (
        <p className="text-xs text-amber-400/80">
          ✍ Check MetaMask — a signature request is pending
        </p>
      )}
      {step === 'error' && error && error !== 'no_wallet' && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function ConnectWalletButton() {
  const wagmiReady = useWagmiReady();

  if (!wagmiReady) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)', opacity: 0.6 }}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Connect Wallet
      </div>
    );
  }

  if (!hasWalletProvider()) {
    return <NoWalletInstalled />;
  }

  return <WalletButtonInner />;
}
