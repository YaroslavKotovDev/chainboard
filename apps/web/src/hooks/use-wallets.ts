'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { WalletRecord } from '@chainboard/types';

import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

// ─── Query key factory ────────────────────────────────────────────────────────

export const walletKeys = {
  all: ['wallets'] as const,
  list: () => [...walletKeys.all, 'list'] as const,
  detail: (address: string) => [...walletKeys.all, 'detail', address] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useWallets() {
  const { getToken } = useAuth();

  return useQuery<WalletRecord[]>({
    queryKey: walletKeys.list(),
    queryFn: () => {
      const token = getToken();
      return apiClient.get<WalletRecord[]>('/wallets', token ?? undefined);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useWalletDetail(address: string) {
  const { getToken } = useAuth();

  return useQuery<WalletRecord & { transactions: unknown[] }>({
    queryKey: walletKeys.detail(address),
    queryFn: () => {
      const token = getToken();
      return apiClient.get<WalletRecord & { transactions: unknown[] }>(
        `/wallets/${address}`,
        token ?? undefined,
      );
    },
    enabled: Boolean(address),
    staleTime: 60 * 1000,
  });
}

export function useSetWalletLabel() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ address, label }: { address: string; label: string }) => {
      const token = getToken();
      return apiClient.post<WalletRecord>(
        `/wallets/${address}/label`,
        { label },
        token ?? undefined,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: walletKeys.list() });
    },
  });
}
