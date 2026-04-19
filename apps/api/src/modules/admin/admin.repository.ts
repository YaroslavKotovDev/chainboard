import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type {
  AdminCreateRewardDto,
  AdminUpdateClaimStatusDto,
  AdminUpdateRewardStatusDto,
} from './dto/admin.dto';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers() {
    return this.prisma.user.count();
  }

  countWallets() {
    return this.prisma.wallet.count();
  }

  countRewards() {
    return this.prisma.reward.count();
  }

  countClaims(status?: string) {
    return this.prisma.claim.count({
      ...(status ? { where: { status: status as never } } : {}),
    });
  }

  countTransactions() {
    return this.prisma.transaction.count();
  }

  findUsers(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { OR: [{ wallets: { some: { address: { contains: search.toLowerCase() } } } }] }
      : {};

    return Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallets: { select: { id: true, address: true, chainId: true } },
          role: { select: { name: true } },
          _count: { select: { claims: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
  }

  findUserDetail(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        role: true,
        claims: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { reward: { select: { title: true } } },
        },
      },
    });
  }

  findAllRewards() {
    return this.prisma.reward.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { claims: true } } },
    });
  }

  createReward(dto: AdminCreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        title: dto.title,
        description: dto.description,
        totalAmount: dto.totalAmount,
        claimedAmount: 0,
        status: dto.status as 'ACTIVE' | 'PAUSED' | 'EXPIRED',
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    });
  }

  findRewardById(rewardId: string) {
    return this.prisma.reward.findUnique({ where: { id: rewardId } });
  }

  updateRewardStatus(rewardId: string, dto: AdminUpdateRewardStatusDto) {
    return this.prisma.reward.update({
      where: { id: rewardId },
      data: { status: dto.status },
    });
  }

  findClaims(page: number, limit: number, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as never } : {};

    return Promise.all([
      this.prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true } },
          wallet: { select: { address: true } },
          reward: { select: { title: true } },
          transactions: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.claim.count({ where }),
    ]);
  }

  findClaimById(claimId: string) {
    return this.prisma.claim.findUnique({ where: { id: claimId } });
  }

  updateClaimStatus(claimId: string, dto: AdminUpdateClaimStatusDto) {
    return this.prisma.claim.update({
      where: { id: claimId },
      data: {
        status: dto.status,
        claimedAt: dto.status === 'CONFIRMED' ? new Date() : undefined,
      },
    });
  }

  findAuditLog(page: number, limit: number) {
    const skip = (page - 1) * limit;

    return Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);
  }
}
