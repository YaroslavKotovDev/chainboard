'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createContext, useContext, useEffect, useState } from 'react';

import { wagmiConfig } from '@/lib/wagmi-config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

/**
 * WagmiReadyContext — set to `true` only when WagmiProvider is confirmed
 * to be in the React tree. Components that call wagmi hooks must read this
 * before rendering to avoid "Provider not found" errors.
 */
const WagmiReadyContext = createContext(false);
export const useWagmiReady = () => useContext(WagmiReadyContext);

interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3Provider
 *
 * Problem: wagmi v3's Hydrate component calls useRef() during Next.js 15 +
 * React 19 SSR where the dispatcher is null → crash.
 *
 * Fix: defer WagmiProvider to after client mount. Children always render
 * (so AuthGuard/AuthProvider work immediately). Components that call wagmi
 * hooks read `useWagmiReady()` — guaranteed true only when WagmiProvider
 * is in the tree.
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {mounted ? (
        // WagmiProvider IS in the tree — signal ready=true via context
        <WagmiProvider config={wagmiConfig}>
          <WagmiReadyContext.Provider value={true}>
            {children}
          </WagmiReadyContext.Provider>
        </WagmiProvider>
      ) : (
        // WagmiProvider NOT yet in tree — signal ready=false
        // Children render normally (AuthGuard, layouts, etc. all work)
        // Only wagmi-hook components check useWagmiReady() before firing
        <WagmiReadyContext.Provider value={false}>
          {children}
        </WagmiReadyContext.Provider>
      )}
    </QueryClientProvider>
  );
}
