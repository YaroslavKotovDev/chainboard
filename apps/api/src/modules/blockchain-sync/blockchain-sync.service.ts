import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  createPublicClient,
  http,
  parseAbiItem,
  type Log,
  type PublicClient,
} from 'viem';
import { baseSepolia } from 'viem/chains';

import type { AppConfig } from '../../config/configuration';
import { BlockchainSyncRepository } from './blockchain-sync.repository';
import {
  BLOCKCHAIN_SYNC_QUEUE,
  BlockchainSyncJobName,
  type ProcessClaimExecutedJobData,
} from './blockchain-sync.types';

const CLAIMED_EVENT = parseAbiItem(
  'event Claimed(address indexed recipient, uint256 amount, uint256 nonce, bytes32 indexed payloadHash)',
);

@Injectable()
export class BlockchainSyncService {
  private readonly logger = new Logger(BlockchainSyncService.name);
  private readonly client: PublicClient;
  private readonly pollIntervalMs: number;
  private readonly batchSize: bigint;
  private readonly finalityBlocks: bigint;
  private readonly startBlock: bigint;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly repository: BlockchainSyncRepository,
    @InjectQueue(BLOCKCHAIN_SYNC_QUEUE)
    private readonly queue: Queue,
  ) {
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(this.config.get('RPC_URL_BASE_SEPOLIA', { infer: true })),
    }) as PublicClient;
    this.pollIntervalMs = this.config.get('BLOCKCHAIN_SYNC_POLL_INTERVAL_MS', { infer: true });
    this.batchSize = BigInt(this.config.get('BLOCKCHAIN_SYNC_BATCH_SIZE', { infer: true }));
    this.finalityBlocks = BigInt(
      this.config.get('BLOCKCHAIN_SYNC_FINALITY_BLOCKS', { infer: true }),
    );
    this.startBlock = BigInt(this.config.get('BLOCKCHAIN_SYNC_START_BLOCK', { infer: true }));
  }

  async start(): Promise<void> {
    if (this.syncTimer) {
      return;
    }

    this.logger.log(
      `Starting blockchain sync worker (poll=${this.pollIntervalMs}ms, batch=${this.batchSize.toString()}, finality=${this.finalityBlocks.toString()} blocks)`,
    );

    await this.runSyncCycle();
    this.syncTimer = setInterval(() => {
      void this.runSyncCycle();
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async runSyncCycle(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    const claimManagerAddress = this.config.get<string>('CLAIM_MANAGER_ADDRESS');
    if (!claimManagerAddress) {
      this.logger.warn('CLAIM_MANAGER_ADDRESS not set — blockchain sync disabled');
      return;
    }

    this.isSyncing = true;

    try {
      const latestBlock = await this.client.getBlockNumber();
      const safeBlock = latestBlock > this.finalityBlocks
        ? latestBlock - this.finalityBlocks
        : 0n;
      const cursor = await this.repository.findCursor(baseSepolia.id, claimManagerAddress, 'Claimed');
      const fromBlock = cursor?.lastProcessedBlock !== null && cursor?.lastProcessedBlock !== undefined
        ? cursor.lastProcessedBlock + 1n
        : this.startBlock;

      if (fromBlock <= safeBlock) {
        const toBlock = fromBlock + this.batchSize - 1n < safeBlock
          ? fromBlock + this.batchSize - 1n
          : safeBlock;
        const logs = await this.client.getLogs({
          address: claimManagerAddress as `0x${string}`,
          event: CLAIMED_EVENT,
          fromBlock,
          toBlock,
        });

        if (logs.length > 0) {
          this.logger.log(
            `Syncing ${logs.length} Claimed events from blocks ${fromBlock.toString()}..${toBlock.toString()}`,
          );
        }

        await this.handleClaimedLogs(logs, claimManagerAddress);
        await this.repository.upsertCursor(baseSepolia.id, claimManagerAddress, 'Claimed', toBlock);
      }

      await this.reconcilePendingTransactions();
    } catch (error) {
      this.logger.error('Blockchain sync cycle failed', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async handleClaimedLogs(logs: Log[], contractAddress: string): Promise<void> {
    for (const log of logs) {
      const raw = log as unknown as {
        args: { recipient: string; amount: bigint; nonce: bigint; payloadHash: string };
        transactionHash: string;
        blockNumber: bigint;
        logIndex: number;
      };

      if (!raw.transactionHash || raw.blockNumber === undefined) {
        continue;
      }

      const jobData: ProcessClaimExecutedJobData = {
        contractAddress,
        transactionHash: raw.transactionHash,
        blockNumber: Number(raw.blockNumber),
        logIndex: raw.logIndex,
        chainId: baseSepolia.id,
        recipient: raw.args.recipient,
        amount: raw.args.amount.toString(),
        nonce: raw.args.nonce.toString(),
        payloadHash: raw.args.payloadHash,
      };

      await this.queue.add(
        BlockchainSyncJobName.PROCESS_CLAIM_EXECUTED,
        jobData,
        {
          jobId: `claimed-${raw.transactionHash}-${raw.logIndex}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
    }
  }

  private async reconcilePendingTransactions(): Promise<void> {
    const pendingTransactions = await this.repository.findPendingTransactions();

    for (const transaction of pendingTransactions) {
      try {
        const receipt = await this.client.getTransactionReceipt({
          hash: transaction.hash as `0x${string}`,
        });

        if (receipt.status === 'reverted') {
          await this.repository.markTransactionFailed(transaction.hash, transaction.chainId);
          this.logger.warn(`Marked reverted claim transaction as FAILED: ${transaction.hash}`);
        }
      } catch (error) {
        if (
          error instanceof Error &&
          error.name === 'TransactionReceiptNotFoundError'
        ) {
          continue;
        }

        this.logger.warn(`Failed to reconcile tx ${transaction.hash}`, error);
      }
    }
  }
}
