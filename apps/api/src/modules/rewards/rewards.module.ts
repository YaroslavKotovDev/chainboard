import { Module }       from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RewardsController } from './rewards.controller';
import { RewardsRepository } from './rewards.repository';
import { RewardsService }    from './rewards.service';

@Module({
  imports:     [ConfigModule],
  controllers: [RewardsController],
  providers:   [RewardsService, RewardsRepository],
  exports:     [RewardsService],
})
export class RewardsModule {}
