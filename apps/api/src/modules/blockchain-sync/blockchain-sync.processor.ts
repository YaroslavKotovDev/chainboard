import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { BlockchainSyncRepository } from './blockchain-sync.repository';
import {
  BLOCKCHAIN_SYNC_QUEUE,
  BlockchainSyncJobName,
  type ProcessClaimExecutedJobData,
} from './blockchain-sync.types';

/**
 * BullMQ worker that projects blockchain events into application state.
 * The worker process owns this runtime; API replicas do not register processors.
 */
@Processor(BLOCKCHAIN_SYNC_QUEUE)
export class BlockchainSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(BlockchainSyncProcessor.name);

  constructor(private readonly repository: BlockchainSyncRepository) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case BlockchainSyncJobName.PROCESS_CLAIM_EXECUTED:
        await this.handleClaimExecuted(job.data as ProcessClaimExecutedJobData);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleClaimExecuted(data: ProcessClaimExecutedJobData): Promise<void> {
    this.logger.debug(`Processing Claimed: tx=${data.transactionHash} nonce=${data.nonce}`);

    await this.repository.recordClaimExecutedEvent(data.contractAddress, data);

    const wallet = await this.repository.findWalletByAddress(data.recipient);
    if (!wallet) {
      this.logger.warn(`No wallet found for recipient ${data.recipient}`);
      return;
    }

    const claim = await this.repository.findClaimByWalletAndNonce(wallet.id, Number(data.nonce));
    if (!claim) {
      this.logger.warn(
        `No pending or submitted claim found for wallet ${wallet.id} nonce ${data.nonce}`,
      );
      return;
    }

    await this.repository.applyClaimExecution(
      claim.id,
      claim.rewardId,
      wallet.id,
      data.chainId,
      data.transactionHash,
      data.blockNumber,
      data.amount,
    );

    this.logger.log(
      `✓ Claim ${claim.id} confirmed — wallet=${data.recipient} amount=${data.amount}`,
    );
  }
}
