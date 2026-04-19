import { ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
});

export class UpdateProfileDto extends createZodDto(UpdateProfileSchema) {
  @ApiPropertyOptional({ example: 'Alice' })
  displayName?: string;
}
