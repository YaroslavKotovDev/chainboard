import { ClaimStatusSchema, EntityIdSchema, RewardStatusSchema } from '@chainboard/types';
import { createZodDto } from 'nestjs-zod';
import { z }            from 'zod';

export class AdminUpdateRewardStatusDto extends createZodDto(
  z.object({
    status: RewardStatusSchema,
  }),
) {}

export class AdminUpdateClaimStatusDto extends createZodDto(
  z.object({
    status: ClaimStatusSchema,
    reason: z.string().max(500).optional(),
  }),
) {}

export class AdminUserQueryDto extends createZodDto(
  z.object({
    page:   z.coerce.number().int().positive().default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
  }),
) {}

export class AdminCreateRewardDto extends createZodDto(
  z.object({
    title:       z.string().min(3).max(120),
    description: z.string().min(10).max(1000),
    totalAmount: z.number().positive(),
    startAt:     z.string().datetime(),
    endAt:       z.string().datetime(),
    status:      RewardStatusSchema.default('PAUSED'),
  }),
) {}

export class AdminClaimsQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: ClaimStatusSchema.optional(),
  }),
) {}

export class AdminPaginationQueryDto extends createZodDto(
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
) {}

export class AdminResourceIdParamDto extends createZodDto(
  z.object({
    id: EntityIdSchema,
  }),
) {}
