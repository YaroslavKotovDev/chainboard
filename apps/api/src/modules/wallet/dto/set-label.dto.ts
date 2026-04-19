import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const SetLabelSchema = z.object({
  label: z.string().min(1).max(50),
});

export class SetLabelDto extends createZodDto(SetLabelSchema) {
  @ApiProperty({ example: 'Hot Wallet' })
  label!: string;
}
