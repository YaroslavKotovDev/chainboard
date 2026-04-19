import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const VerifySignatureSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z
    .string()
    .regex(/^0x[0-9a-fA-F]{130}$/, 'Invalid signature format'),
});

export class VerifySignatureDto extends createZodDto(VerifySignatureSchema) {
  @ApiProperty({ description: 'EIP-4361 formatted SIWE message' })
  message!: string;

  @ApiProperty({ description: 'Hex-encoded wallet signature' })
  signature!: string;
}
