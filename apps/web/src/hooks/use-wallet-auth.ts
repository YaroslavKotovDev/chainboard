'use client';

import { useCallback, useState } from 'react';
import { useConnect, useDisconnect, useSignMessage, useAccount } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { createSiweMessage } from 'viem/siwe';

import { apiClient } from '@/lib/api-client';
import { useAuth, type AuthUser } from '@/providers/auth-provider';

type AuthStep =
  | 'idle'
  | 'connecting'
  | 'signing'
  | 'verifying'
  | 'authenticated'
  | 'error';

interface WalletAuthState {
  step: AuthStep;
  error: string | null;
}

interface UseWalletAuthReturn {
  step: AuthStep;
  error: string | null;
  isConnected: boolean;
  address: string | undefined;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

interface VerifyResponse {
  accessToken: string;
  user: AuthUser;
}

const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532', 10);
const SIWE_DOMAIN = process.env.NEXT_PUBLIC_SIWE_DOMAIN ?? 'localhost';
const SIWE_URI = process.env.NEXT_PUBLIC_SIWE_URI ?? 'http://localhost:3000';

/** Returns true if a browser wallet (window.ethereum) is available */
export function hasWalletProvider(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as { ethereum?: unknown }).ethereum !== 'undefined';
}

export function useWalletAuth(): UseWalletAuthReturn {
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { login, logout: authLogout } = useAuth();

  const [state, setState] = useState<WalletAuthState>({ step: 'idle', error: null });

  const connect = useCallback(async () => {
    setState({ step: 'connecting', error: null });

    try {
      // Step 1: Connect wallet
      let connectedAddress = address;

      if (!isConnected || !connectedAddress) {
        const result = await connectAsync({ connector: injected() });
        connectedAddress = result.accounts[0];
      }

      if (!connectedAddress) {
        throw new Error('No wallet address available after connection');
      }

      setState({ step: 'signing', error: null });

      // Step 2: Fetch nonce from backend
      const { nonce } = await apiClient.post<NonceResponse>('/auth/nonce', {
        address: connectedAddress,
        chainId: CHAIN_ID,
      });

      // Step 3: Construct EIP-4361 message using viem (browser-compatible)
      const message = createSiweMessage({
        domain: SIWE_DOMAIN,
        address: connectedAddress as `0x${string}`,
        statement: 'Sign in to ChainBoard with your wallet.',
        uri: SIWE_URI,
        version: '1',
        chainId: CHAIN_ID,
        nonce,
        issuedAt: new Date(),
      });

      // Step 4: Sign the message
      const signature = await signMessageAsync({ message });

      setState({ step: 'verifying', error: null });

      // Step 5: Submit signature for verification
      const { accessToken, user } = await apiClient.post<VerifyResponse>('/auth/verify', {
        message,
        signature,
      });

      // Step 6: Store token and update auth context
      login(accessToken, user);
      setState({ step: 'authenticated', error: null });
    } catch (err: unknown) {
      // ProviderNotFoundError = no wallet extension installed in the browser
      // wagmi throws this as an Error with name "ProviderNotFoundError"
      if (
        err instanceof Error && (
          err.name === 'ProviderNotFoundError' ||
          err.message.toLowerCase().includes('provider not found') ||
          err.message.toLowerCase().includes('no injected provider')
        )
      ) {
        setState({ step: 'error', error: 'no_wallet' });
        return;
      }
      // User rejected the connection or signature request
      if (err instanceof Error && (err.message.includes('User rejected') || err.message.includes('user rejected') || err.message.includes('rejected'))) {
        setState({ step: 'idle', error: null });
        return;
      }
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setState({ step: 'error', error: message });
    }
  }, [address, isConnected, connectAsync, signMessageAsync, login]);

  const disconnect = useCallback(async () => {
    await disconnectAsync();
    await authLogout();
    setState({ step: 'idle', error: null });
  }, [disconnectAsync, authLogout]);

  return {
    step: state.step,
    error: state.error,
    isConnected,
    address,
    connect,
    disconnect,
  };
}
