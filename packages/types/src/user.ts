import { z } from 'zod';

import { EntityIdSchema } from './common';

export const RoleNameSchema = z.enum(['USER', 'ADMIN', 'REVIEWER']);
export type RoleName = z.infer<typeof RoleNameSchema>;

export const UserProfileSchema = z.object({
  id: EntityIdSchema,
  displayName: z.string().nullable(),
  role: RoleNameSchema,
  walletCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UpdateProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(64).nullable(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
