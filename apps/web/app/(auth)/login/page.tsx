'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { ConnectWalletButton } from '@/components/auth/connect-wallet-button';
import { useAuth } from '@/providers/auth-provider';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to dashboard as soon as authentication is confirmed
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't flash the login form if we're about to redirect
  if (isAuthenticated) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">ChainBoard</h1>
            <p className="text-sm text-zinc-400">Web3 Analytics Dashboard</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="mb-2 text-center text-lg font-semibold text-white">
            Sign in with your wallet
          </h2>
          <p className="mb-8 text-center text-sm text-zinc-400">
            Connect your Ethereum wallet to access the dashboard. No password required.
          </p>

          <div className="flex justify-center">
            <ConnectWalletButton />
          </div>

          <div className="mt-8 border-t border-zinc-800 pt-6">
            <p className="text-center text-xs text-zinc-500">
              By signing in, you agree to sign a message proving wallet ownership.
              No transaction will be submitted.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
