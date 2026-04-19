import { z } from 'zod';

import { EntityIdSchema } from './common';

export const SnapshotScopeSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export type SnapshotScope = z.infer<typeof SnapshotScopeSchema>;

export const AnalyticsSnapshotSchema = z.object({
  id: EntityIdSchema,
  scope: SnapshotScopeSchema,
  metric: z.string(),
  value: z.number(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

export type AnalyticsSnapshot = z.infer<typeof AnalyticsSnapshotSchema>;

export const AnalyticsSummarySchema = z.object({
  totalClaims: z.number().int().nonnegative(),
  totalRewards: z.number().int().nonnegative(),
  activeWallets: z.number().int().nonnegative(),
  claimSuccessRate: z.number().min(0).max(100),
  periodComparison: z.object({
    claimsDelta: z.number(),
    walletsDelta: z.number(),
    successRateDelta: z.number(),
  }),
});

export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;

export const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['CLAIM', 'TRANSACTION']),
  status: z.string(),
  walletAddress: z.string(),
  description: z.string(),
  timestamp: z.string().datetime(),
  transactionHash: z.string().nullable(),
});

export type ActivityItem = z.infer<typeof ActivityItemSchema>;
