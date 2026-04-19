import { createZodDto } from 'nestjs-zod';
import { EntityIdSchema, WalletAddressSchema } from '@chainboard/types';
import { z } from 'zod';

export class ResourceIdParamDto extends createZodDto(
  z.object({
    id: EntityIdSchema,
  }),
) {}

export class ClaimIdParamDto extends createZodDto(
  z.object({
    claimId: EntityIdSchema,
  }),
) {}

export class WalletAddressParamDto extends createZodDto(
  z.object({
    address: WalletAddressSchema,
  }),
) {}
