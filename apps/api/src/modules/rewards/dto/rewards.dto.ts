import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class InitiateClaimDto extends createZodDto(
  z.object({
    walletAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Must be a valid EVM address'),
  }),
) {}

export class SubmitClaimTransactionDto extends createZodDto(
  z.object({
    transactionHash: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/, 'Must be a valid transaction hash'),
    chainId: z.number().int().positive().default(84532),
  }),
) {}

export class ClaimHistoryQueryDto extends createZodDto(
  z.object({
    status: z
      .enum(['PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED', 'REJECTED'])
      .optional(),
  }),
) {}
