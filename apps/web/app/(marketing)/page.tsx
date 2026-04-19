import Link from 'next/link';
import { ArrowRight, BarChart3, Shield, Wallet } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-semibold text-white">ChainBoard</span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Launch App
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          Live on Base Sepolia
        </div>

        <h1 className="mb-6 max-w-3xl text-5xl font-bold leading-tight text-white">
          Web3 Analytics &amp;{' '}
          <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Reward Management
          </span>
        </h1>

        <p className="mb-10 max-w-xl text-lg text-zinc-400">
          Track on-chain activity, manage reward programs, and monitor wallet performance
          with real-time blockchain data.
        </p>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-500"
        >
          <Wallet className="h-5 w-5" />
          Connect Wallet to Start
        </Link>
      </section>

      {/* Feature grid */}
      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: BarChart3,
              title: 'Real-time Analytics',
              description: 'Track claims, volumes, and wallet activity across multiple time ranges.',
            },
            {
              icon: Shield,
              title: 'SIWE Authentication',
              description: 'Sign-in with Ethereum — no passwords, no email. Your wallet is your identity.',
            },
            {
              icon: Wallet,
              title: 'Reward Programs',
              description: 'Create and manage on-chain reward programs with transparent eligibility rules.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <Icon className="mb-4 h-8 w-8 text-blue-500" />
              <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
              <p className="text-sm text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
