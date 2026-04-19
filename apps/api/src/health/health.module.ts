import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'health' })],
  controllers: [HealthController],
})
export class HealthModule {}
