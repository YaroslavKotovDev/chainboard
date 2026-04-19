import { z } from 'zod';

import { EntityIdSchema, WalletAddressSchema } from './common';

export const AuthNonceRequestSchema = z.object({
  address: WalletAddressSchema,
  chainId: z.number().int().positive(),
});

export type AuthNonceRequest = z.infer<typeof AuthNonceRequestSchema>;

export const AuthNonceResponseSchema = z.object({
  nonce: z.string(),
  expiresAt: z.string().datetime(),
});

export type AuthNonceResponse = z.infer<typeof AuthNonceResponseSchema>;

export const AuthVerifyRequestSchema = z.object({
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),
});

export type AuthVerifyRequest = z.infer<typeof AuthVerifyRequestSchema>;

export const AuthSessionSchema = z.object({
  userId: EntityIdSchema,
  address: WalletAddressSchema,
  chainId: z.number().int(),
  sessionId: EntityIdSchema,
  expiresAt: z.string().datetime(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;
