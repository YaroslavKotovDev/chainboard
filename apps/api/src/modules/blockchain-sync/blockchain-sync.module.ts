import { Module }           from '@nestjs/common';
import { ConfigModule }     from '@nestjs/config';
import { BullModule }       from '@nestjs/bullmq';

import { BlockchainSyncRepository } from './blockchain-sync.repository';
import { BlockchainSyncService }   from './blockchain-sync.service';
import { BlockchainSyncProcessor } from './blockchain-sync.processor';
import { BLOCKCHAIN_SYNC_QUEUE }   from './blockchain-sync.types';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: BLOCKCHAIN_SYNC_QUEUE,
    }),
  ],
  providers: [BlockchainSyncRepository, BlockchainSyncService, BlockchainSyncProcessor],
  exports:   [BlockchainSyncService],
})
export class BlockchainSyncModule {}
