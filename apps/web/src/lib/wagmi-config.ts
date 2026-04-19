import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '';

/**
 * wagmiConfig is created once at module-level.
 * WagmiProvider renders only after client mount (see Web3Provider),
 * so we don't need ssr:true or cookieStorage here.
 */
export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA),
  },
});
