import { z } from 'zod';

import { EntityIdSchema, WalletAddressSchema } from './common';

export const WalletRecordSchema = z.object({
  id: EntityIdSchema,
  address: WalletAddressSchema,
  chainId: z.number().int().positive(),
  label: z.string().nullable(),
  isVerified: z.boolean(),
  transactionCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type WalletRecord = z.infer<typeof WalletRecordSchema>;

export const SetWalletLabelRequestSchema = z.object({
  label: z.string().min(1).max(32),
});

export type SetWalletLabelRequest = z.infer<typeof SetWalletLabelRequestSchema>;
