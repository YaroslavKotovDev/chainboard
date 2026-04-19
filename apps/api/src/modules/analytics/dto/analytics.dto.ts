import { SnapshotScopeSchema } from '@chainboard/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class AnalyticsSnapshotsQueryDto extends createZodDto(
  z.object({
    scope: SnapshotScopeSchema.default('DAILY'),
    metric: z.string().min(1).default('claims_count'),
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
) {}
