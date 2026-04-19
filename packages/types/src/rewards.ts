import { z } from 'zod';

import { EntityIdSchema, TransactionHashSchema, WalletAddressSchema } from './common';

export const RewardStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'EXPIRED']);
export type RewardStatus = z.infer<typeof RewardStatusSchema>;

export const ClaimStatusSchema = z.enum([
  'PENDING',
  'SUBMITTED',
  'CONFIRMED',
  'FAILED',
  'REJECTED',
]);
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

export const TransactionStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'FAILED', 'REJECTED']);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const RewardSummarySchema = z.object({
  id: EntityIdSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: RewardStatusSchema,
  totalAmount: z.string(),
  claimedAmount: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isEligible: z.boolean(),
  userClaimStatus: ClaimStatusSchema.nullable(),
});

export type RewardSummary = z.infer<typeof RewardSummarySchema>;

export const ClaimRecordSchema = z.object({
  id: EntityIdSchema,
  rewardId: EntityIdSchema,
  rewardTitle: z.string(),
  walletAddress: WalletAddressSchema,
  status: ClaimStatusSchema,
  transactionHash: z.string().nullable(),
  claimedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type ClaimRecord = z.infer<typeof ClaimRecordSchema>;

export const InitiateClaimRequestSchema = z.object({
  walletAddress: WalletAddressSchema,
});

export type InitiateClaimRequest = z.infer<typeof InitiateClaimRequestSchema>;

export const SubmitClaimTransactionRequestSchema = z.object({
  transactionHash: TransactionHashSchema,
});

export type SubmitClaimTransactionRequest = z.infer<typeof SubmitClaimTransactionRequestSchema>;
