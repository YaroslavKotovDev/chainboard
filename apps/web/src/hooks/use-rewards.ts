'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RewardSummary, ClaimRecord } from '@chainboard/types';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';

// ── Query keys ────────────────────────────────────────────────────────────────

export const rewardKeys = {
  all:    ['rewards'] as const,
  list:   () => [...rewardKeys.all, 'list'] as const,
  detail: (id: string) => [...rewardKeys.all, 'detail', id] as const,
  claims: () => [...rewardKeys.all, 'claims'] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useRewards() {
  const { getToken } = useAuth();

  return useQuery<RewardSummary[]>({
    queryKey: rewardKeys.list(),
    queryFn:  () => apiClient.get<RewardSummary[]>('/rewards', getToken() ?? undefined),
    staleTime: 60_000,
  });
}

export function useReward(rewardId: string) {
  const { getToken } = useAuth();

  return useQuery<RewardSummary>({
    queryKey: rewardKeys.detail(rewardId),
    queryFn:  () => apiClient.get<RewardSummary>(`/rewards/${rewardId}`, getToken() ?? undefined),
    enabled:  !!rewardId,
    staleTime: 60_000,
  });
}

export function useClaimHistory(status?: string) {
  const { getToken } = useAuth();

  return useQuery<ClaimRecord[]>({
    queryKey: [...rewardKeys.claims(), status],
    queryFn:  () => {
      const url = status ? `/rewards/claims?status=${status}` : '/rewards/claims';
      return apiClient.get<ClaimRecord[]>(url, getToken() ?? undefined);
    },
    staleTime: 30_000,
  });
}

// ── Claim mutation ─────────────────────────────────────────────────────────────

interface InitiateClaimPayload {
  rewardId:      string;
  walletAddress: string;
}

interface InitiateClaimResponse {
  claimId: string;
  status:  string;
}

export function useInitiateClaim() {
  const { getToken } = useAuth();
  const queryClient   = useQueryClient();

  return useMutation<InitiateClaimResponse, Error, InitiateClaimPayload>({
    mutationFn: ({ rewardId, walletAddress }) =>
      apiClient.post<InitiateClaimResponse>(
        `/rewards/${rewardId}/claim`,
        { walletAddress },
        getToken() ?? undefined,
      ),
    onSuccess: () => {
      // Invalidate rewards list + claims so UI updates immediately
      void queryClient.invalidateQueries({ queryKey: rewardKeys.list() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.claims() });
    },
  });
}

interface SubmitTxPayload {
  claimId:         string;
  transactionHash: string;
  chainId:         number;
}

interface SubmitTxResponse {
  claimId:         string;
  status:          string;
  transactionHash: string;
}

export function useSubmitClaimTransaction() {
  const { getToken } = useAuth();
  const queryClient   = useQueryClient();

  return useMutation<SubmitTxResponse, Error, SubmitTxPayload>({
    mutationFn: ({ claimId, transactionHash, chainId }) =>
      apiClient.patch<SubmitTxResponse>(
        `/rewards/claims/${claimId}/submit`,
        { transactionHash, chainId },
        getToken() ?? undefined,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: rewardKeys.claims() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.list() });
    },
  });
}

// ── Operator signature (on-chain claim authorization) ─────────────────────────

export interface ClaimAuthorization {
  claimId:   string;
  recipient: `0x${string}`;
  amount:    string; // bigint as string for JSON transport
  nonce:     string; // bigint as string
  deadline:  string; // unix timestamp as string
  signature: `0x${string}`;
}

interface RequestSignaturePayload {
  claimId: string;
}

/**
 * Requests an EIP-712 operator signature from the backend for a pending claim.
 * The returned payload can be passed directly to ClaimManager.claim() on-chain.
 */
export function useRequestClaimSignature() {
  const { getToken } = useAuth();

  return useMutation<ClaimAuthorization, Error, RequestSignaturePayload>({
    mutationFn: ({ claimId }) =>
      apiClient.post<ClaimAuthorization>(
        `/rewards/claims/${claimId}/authorize`,
        {},
        getToken() ?? undefined,
      ),
  });
}
