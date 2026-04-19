'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth }   from '@/providers/auth-provider';

// ── Query keys ────────────────────────────────────────────────────────────────

const adminKeys = {
  stats:   ['admin', 'stats']   as const,
  users:   (p: number, q?: string) => ['admin', 'users', p, q] as const,
  rewards: ['admin', 'rewards'] as const,
  claims:  (p: number, s?: string) => ['admin', 'claims', p, s] as const,
  audit:   (p: number) => ['admin', 'audit', p] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
  users:        { total: number; withWallets: number };
  rewards:      { total: number };
  claims:       { total: number; pending: number; confirmed: number; failed: number };
  transactions: { total: number };
}

export interface AdminUser {
  id:         string;
  role:       string;
  wallets:    { id: string; address: string; chainId: number }[];
  claimCount: number;
  createdAt:  string;
}

export interface AdminReward {
  id:            string;
  title:         string;
  status:        string;
  totalAmount:   string;
  claimedAmount: string;
  claimCount:    number;
  startAt:       string;
  endAt:         string;
  createdAt:     string;
}

export interface AdminClaim {
  id:              string;
  userId:          string;
  walletAddress:   string;
  rewardTitle:     string;
  status:          string;
  transactionHash: string | null;
  claimedAt:       string | null;
  createdAt:       string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAdminStats() {
  const { getToken } = useAuth();
  return useQuery<AdminStats>({
    queryKey: adminKeys.stats,
    queryFn:  () => apiClient.get<AdminStats>('/admin/stats', getToken() ?? undefined),
    staleTime: 30_000,
  });
}

export function useAdminUsers(page = 1, search?: string) {
  const { getToken } = useAuth();
  return useQuery<PaginatedResponse<AdminUser>>({
    queryKey: adminKeys.users(page, search),
    queryFn:  () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      return apiClient.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`, getToken() ?? undefined);
    },
    staleTime: 30_000,
  });
}

export function useAdminRewards() {
  const { getToken } = useAuth();
  return useQuery<AdminReward[]>({
    queryKey: adminKeys.rewards,
    queryFn:  () => apiClient.get<AdminReward[]>('/admin/rewards', getToken() ?? undefined),
    staleTime: 30_000,
  });
}

export function useAdminClaims(page = 1, status?: string) {
  const { getToken } = useAuth();
  return useQuery<PaginatedResponse<AdminClaim>>({
    queryKey: adminKeys.claims(page, status),
    queryFn:  () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      return apiClient.get<PaginatedResponse<AdminClaim>>(`/admin/claims?${params}`, getToken() ?? undefined);
    },
    staleTime: 15_000,
  });
}

export function useUpdateRewardStatus() {
  const { getToken }  = useAuth();
  const queryClient   = useQueryClient();

  return useMutation<AdminReward, Error, { id: string; status: string }>({
    mutationFn: ({ id, status }) =>
      apiClient.patch<AdminReward>(`/admin/rewards/${id}/status`, { status }, getToken() ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.rewards });
    },
  });
}

export function useUpdateClaimStatus() {
  const { getToken }  = useAuth();
  const queryClient   = useQueryClient();

  return useMutation<AdminClaim, Error, { id: string; status: string; reason?: string }>({
    mutationFn: ({ id, status, reason }) =>
      apiClient.patch<AdminClaim>(`/admin/claims/${id}/status`, { status, reason }, getToken() ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'claims'] });
    },
  });
}
