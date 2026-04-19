'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  LayoutDashboard,
  LineChart,
  ShieldCheck,
  Wallet,
  Gift,
} from 'lucide-react';
import { cn } from '@chainboard/ui';
import { useAuth } from '@/providers/auth-provider';
import { WalletAddress } from '@chainboard/ui';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Analytics',  href: '/analytics',  icon: LineChart },
  { label: 'Rewards',    href: '/rewards',    icon: Gift },
  { label: 'Wallets',    href: '/wallets',    icon: Wallet },
  { label: 'Admin',      href: '/admin',      icon: ShieldCheck, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user }  = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === 'ADMIN',
  );

  return (
    <aside
      className="flex h-screen w-60 flex-shrink-0 flex-col"
      style={{
        background: 'rgb(13 13 16)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.35)',
          }}
        >
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">ChainBoard</span>
          <span
            className="ml-1.5 rounded px-1 py-0.5 text-[10px] font-medium"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
          >
            Beta
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-blue-300'
                  : 'text-zinc-500 hover:text-zinc-200',
              )}
              style={
                isActive
                  ? {
                      background: 'rgba(59, 130, 246, 0.08)',
                      boxShadow: 'inset 0 0 0 1px rgba(59,130,246,0.15)',
                    }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = '';
                }
              }}
            >
              {/* Active left-edge indicator */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                  style={{ background: 'linear-gradient(180deg, #60a5fa, #3b82f6)' }}
                />
              )}

              <item.icon
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-colors',
                  isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300',
                )}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Wallet footer ── */}
      {user ? (
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="rounded-lg p-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Connected</span>
            </div>
            <WalletAddress address={user.address} showCopy variant="subtle" />
            {user.role !== 'USER' && (
              <span
                className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                {user.role}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="rounded-lg p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <span className="text-xs text-zinc-600">No wallet connected</span>
          </div>
        </div>
      )}
    </aside>
  );
}
