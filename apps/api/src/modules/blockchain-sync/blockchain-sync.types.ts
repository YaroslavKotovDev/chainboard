/**
 * Shared types for the blockchain event sync worker.
 */

export const BLOCKCHAIN_SYNC_QUEUE = 'blockchain-sync';

export const BlockchainSyncJobName = {
  SYNC_EVENTS: 'sync-events',
  PROCESS_CLAIM_EXECUTED: 'process-claim-executed',
  PROCESS_CLAIM_RELEASED: 'process-claim-released',
} as const;

export type BlockchainSyncJobName =
  (typeof BlockchainSyncJobName)[keyof typeof BlockchainSyncJobName];

// ── Job payloads ──────────────────────────────────────────────────────────────

export interface SyncEventsJobData {
  contractAddress: string;
  fromBlock:       bigint | 'latest';
  toBlock:         bigint | 'latest';
}

export interface ProcessClaimExecutedJobData {
  contractAddress: string;
  transactionHash: string;
  blockNumber:     number;
  logIndex:        number;
  chainId:         number;
  recipient:       string;
  amount:          string; // bigint as string
  nonce:           string; // bigint as string
  payloadHash:     string;
}

export interface ProcessClaimReleasedJobData {
  transactionHash: string;
  blockNumber:     number;
  logIndex:        number;
  chainId:         number;
  recipient:       string;
  amount:          string;
}
