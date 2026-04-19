'use client';

import { usePathname } from 'next/navigation';
import { Bell, ChevronRight } from 'lucide-react';
import { WalletAddress } from '@chainboard/ui';
import { ConnectWalletButton } from '@/components/auth/connect-wallet-button';
import { useAuth } from '@/providers/auth-provider';

const ROUTE_META: Record<string, { title: string; parent?: string }> = {
  '/dashboard':         { title: 'Dashboard' },
  '/analytics':         { title: 'Analytics' },
  '/rewards':           { title: 'Rewards' },
  '/wallets':           { title: 'Wallets' },
  '/admin':             { title: 'Overview', parent: 'Admin' },
  '/admin/claims':      { title: 'Claims',   parent: 'Admin' },
  '/admin/users':       { title: 'Users',    parent: 'Admin' },
  '/admin/audit-logs':  { title: 'Audit Logs', parent: 'Admin' },
};

/** Base Sepolia chain info */
const CHAIN = { name: 'Base Sepolia', color: '#0052ff' };

export function TopBar() {
  const pathname = usePathname();
  const { user }  = useAuth();
  const meta      = ROUTE_META[pathname] ?? { title: 'ChainBoard' };

  return (
    <header
      className="flex h-14 items-center justify-between px-6"
      style={{
        background: 'rgba(10, 10, 11, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ── Left: Breadcrumb ── */}
      <div className="flex items-center gap-2 text-sm">
        {meta.parent && (
          <>
            <span className="font-medium text-zinc-500">{meta.parent}</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
          </>
        )}
        <span className="font-semibold text-zinc-100">{meta.title}</span>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2">
        {/* Network badge */}
        {user && (
          <div
            className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: 'rgba(0, 82, 255, 0.08)',
              border: '1px solid rgba(0, 82, 255, 0.2)',
              color: '#93bbff',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: CHAIN.color, boxShadow: `0 0 6px ${CHAIN.color}` }}
            />
            {CHAIN.name}
          </div>
        )}

        {/* Notifications */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all duration-200 hover:text-zinc-200 focus:outline-none"
          style={{ border: '1px solid transparent' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '';
            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
          }}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Wallet badge or connect */}
        {user ? (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            <WalletAddress address={user.address} showCopy={false} />
          </div>
        ) : (
          <ConnectWalletButton />
        )}
      </div>
    </header>
  );
}
