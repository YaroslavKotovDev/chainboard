import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { AuthProvider } from '@/providers/auth-provider';
import { Web3Provider } from '@/providers/web3-provider';
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | ChainBoard',
    default: 'ChainBoard – Web3 Analytics Dashboard',
  },
  description: 'Real-time analytics and reward management for Web3 applications',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-[#0a0a0b] font-sans text-zinc-100">
        {/*
          Provider order matters:
          1. AuthProvider — no wagmi dependency, resolves isLoading immediately.
             Must be OUTSIDE Web3Provider so AuthGuard works before wagmi mounts.
          2. Web3Provider — defers WagmiProvider to client mount to avoid the
             React 19 SSR dispatcher null crash in wagmi's Hydrate component.
        */}
        <AuthProvider>
          <Web3Provider>
            {children}
          </Web3Provider>
        </AuthProvider>
      </body>
    </html>
  );
}
