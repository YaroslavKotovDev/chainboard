import { Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { bigIntToDecimalString } from '@chainboard/utils';

import { canTransitionClaimStatus } from '../../common/domain/claim-state';
import { PrismaService } from '../../prisma/prisma.service';
import type { ProcessClaimExecutedJobData } from './blockchain-sync.types';

@Injectable()
export class BlockchainSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCursor(chainId: number, contractAddress: string, eventName: string) {
    return this.prisma.blockchainSyncCursor.findUnique({
      where: {
        chainId_contractAddress_eventName: {
          chainId,
          contractAddress,
          eventName,
        },
      },
    });
  }

  upsertCursor(
    chainId: number,
    contractAddress: string,
    eventName: string,
    lastProcessedBlock: bigint,
  ) {
    return this.prisma.blockchainSyncCursor.upsert({
      where: {
        chainId_contractAddress_eventName: {
          chainId,
          contractAddress,
          eventName,
        },
      },
      create: {
        chainId,
        contractAddress,
        eventName,
        lastProcessedBlock,
      },
      update: {
        lastProcessedBlock,
      },
    });
  }

  recordClaimExecutedEvent(contractAddress: string, data: ProcessClaimExecutedJobData) {
    return this.prisma.blockchainEvent.upsert({
      where: {
        chainId_transactionHash_logIndex: {
          chainId: data.chainId,
          transactionHash: data.transactionHash,
          logIndex: data.logIndex,
        },
      },
      create: {
        chainId: data.chainId,
        contractAddress,
        transactionHash: data.transactionHash,
        blockNumber: BigInt(data.blockNumber),
        logIndex: data.logIndex,
        eventName: 'Claimed',
        decodedData: JSON.parse(JSON.stringify(data)),
        processedAt: new Date(),
      },
      update: {
        processedAt: new Date(),
      },
    });
  }

  findWalletByAddress(address: string) {
    return this.prisma.wallet.findFirst({
      where: { address: address.toLowerCase() },
    });
  }

  findClaimByWalletAndNonce(walletId: string, nonce: number) {
    return this.prisma.claim.findFirst({
      where: {
        walletId,
        nonce,
        status: { in: ['PENDING', 'SUBMITTED'] },
      },
      include: {
        reward: true,
      },
    });
  }

  async applyClaimExecution(
    claimId: string,
    rewardId: string,
    walletId: string,
    chainId: number,
    transactionHash: string,
    blockNumber: number,
    amount: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id: claimId },
      });

      if (!claim || !canTransitionClaimStatus(claim.status, 'CONFIRMED')) {
        return;
      }

      await tx.claim.update({
        where: { id: claimId },
        data: { status: 'CONFIRMED', claimedAt: new Date() },
      });

      await tx.transaction.upsert({
        where: { hash_chainId: { hash: transactionHash, chainId } },
        create: {
          hash: transactionHash,
          chainId,
          status: 'CONFIRMED',
          claimId,
          walletId,
          blockNumber: BigInt(blockNumber),
        },
        update: {
          status: 'CONFIRMED',
          blockNumber: BigInt(blockNumber),
        },
      });

      await tx.reward.update({
        where: { id: rewardId },
        data: {
          claimedAmount: {
            increment: new Prisma.Decimal(bigIntToDecimalString(BigInt(amount))),
          },
        },
      });
    });
  }

  findPendingTransactions(limit = 100) {
    return this.prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        claim: {
          status: 'SUBMITTED',
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        claim: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
  }

  async markTransactionFailed(hash: string, chainId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { hash_chainId: { hash, chainId } },
        include: { claim: true },
      });

      if (!transaction) {
        return;
      }

      if (transaction.status !== TransactionStatus.FAILED) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' },
        });
      }

      if (
        transaction.claim &&
        canTransitionClaimStatus(transaction.claim.status, 'FAILED')
      ) {
        await tx.claim.update({
          where: { id: transaction.claim.id },
          data: { status: 'FAILED' },
        });
      }
    });
  }
}
