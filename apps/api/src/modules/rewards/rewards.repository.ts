import { Injectable } from '@nestjs/common';
import { ClaimStatus, Prisma } from '@prisma/client';
import { bigIntToDecimalString } from '@chainboard/utils';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Rewards ────────────────────────────────────────────────────────────────

  findAllActive() {
    const now = new Date();
    return this.prisma.reward.findMany({
      where: {
        status: 'ACTIVE',
        startAt: { lte: now },
        endAt:   { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll() {
    return this.prisma.reward.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: string) {
    return this.prisma.reward.findUnique({ where: { id } });
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  findClaimByUserAndRewardAndWallet(userId: string, rewardId: string, walletId: string) {
    return this.prisma.claim.findUnique({
      where: { userId_rewardId_walletId: { userId, rewardId, walletId } },
    });
  }

  findClaimsByUser(userId: string, status?: ClaimStatus) {
    return this.prisma.claim.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: {
        reward:  { select: { title: true } },
        wallet:  { select: { address: true } },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { hash: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findClaimById(id: string) {
    return this.prisma.claim.findUnique({
      where: { id },
      include: {
        reward:       true,
        wallet:       true,
        transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  findWalletByUserAndAddress(userId: string, walletAddress: string) {
    return this.prisma.wallet.findFirst({
      where: {
        userId,
        address: walletAddress.toLowerCase(),
      },
    });
  }

  findWalletById(walletId: string) {
    return this.prisma.wallet.findUnique({
      where: { id: walletId },
    });
  }

  createClaim(userId: string, rewardId: string, walletId: string) {
    return this.prisma.claim.create({
      data: { userId, rewardId, walletId, status: 'PENDING' },
    });
  }

  updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    extra?: { claimedAt?: Date },
  ) {
    return this.prisma.claim.update({
      where: { id: claimId },
      data:  { status, ...extra },
    });
  }

  createTransaction(claimId: string, walletId: string, chainId: number, hash: string) {
    return this.prisma.transaction.create({
      data: {
        hash,
        chainId,
        status:  'PENDING',
        claimId,
        walletId,
      },
    });
  }

  // ── Wallet helper ──────────────────────────────────────────────────────────

  findFirstWalletByUserId(userId: string) {
    return this.prisma.wallet.findFirst({ where: { userId } });
  }

  incrementClaimedAmount(rewardId: string, amount: string) {
    return this.prisma.reward.update({
      where: { id: rewardId },
      data:  {
        claimedAmount: {
          increment: new Prisma.Decimal(bigIntToDecimalString(BigInt(amount))),
        },
      },
    });
  }

  updateClaimAuthorization(
    claimId:  string,
    data: { signature: string; nonce: number; deadline: Date },
  ) {
    return this.prisma.claim.update({
      where: { id: claimId },
      data: {
        signature: data.signature,
        nonce:     data.nonce,
        deadline:  data.deadline,
      },
    });
  }

}
