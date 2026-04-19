import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const NonceRequestSchema = z.object({
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address'),
  chainId: z.number().int().positive(),
});

export class NonceRequestDto extends createZodDto(NonceRequestSchema) {
  @ApiProperty({ example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' })
  address!: string;

  @ApiProperty({ example: 84532 })
  chainId!: number;
}
