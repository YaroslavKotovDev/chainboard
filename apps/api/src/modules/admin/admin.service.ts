import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { canTransitionClaimStatus } from '../../common/domain/claim-state';
import { AdminRepository } from './admin.repository';
import type {
  AdminCreateRewardDto,
  AdminUpdateRewardStatusDto,
  AdminUpdateClaimStatusDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private readonly repository: AdminRepository) {}

  // ── Dashboard stats ────────────────────────────────────────────────────────

  async getDashboardStats() {
    const [
      totalUsers,
      totalWallets,
      totalRewards,
      totalClaims,
      pendingClaims,
      confirmedClaims,
      totalTransactions,
    ] = await Promise.all([
      this.repository.countUsers(),
      this.repository.countWallets(),
      this.repository.countRewards(),
      this.repository.countClaims(),
      this.repository.countClaims('PENDING'),
      this.repository.countClaims('CONFIRMED'),
      this.repository.countTransactions(),
    ]);

    return {
      users: {
        total: totalUsers,
        withWallets: totalWallets,
      },
      rewards: {
        total: totalRewards,
      },
      claims: {
        total:     totalClaims,
        pending:   pendingClaims,
        confirmed: confirmedClaims,
        failed:    totalClaims - pendingClaims - confirmedClaims,
      },
      transactions: {
        total: totalTransactions,
      },
    };
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async listUsers(page: number, limit: number, search?: string) {
    const [users, total] = await this.repository.findUsers(page, limit, search);

    return {
      data: users.map((u) => ({
        id:         u.id,
        role:       u.role?.name ?? 'USER',
        wallets:    u.wallets,
        claimCount: u._count.claims,
        createdAt:  u.createdAt.toISOString(),
      })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.repository.findUserDetail(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ── Rewards ────────────────────────────────────────────────────────────────

  async listAllRewards() {
    const rewards = await this.repository.findAllRewards();

    return rewards.map((r) => ({
      id:            r.id,
      title:         r.title,
      status:        r.status,
      totalAmount:   r.totalAmount.toString(),
      claimedAmount: r.claimedAmount.toString(),
      claimCount:    r._count.claims,
      startAt:       r.startAt.toISOString(),
      endAt:         r.endAt.toISOString(),
      createdAt:     r.createdAt.toISOString(),
    }));
  }

  async createReward(dto: AdminCreateRewardDto) {
    return this.repository.createReward(dto);
  }

  async updateRewardStatus(rewardId: string, dto: AdminUpdateRewardStatusDto) {
    const reward = await this.repository.findRewardById(rewardId);
    if (!reward) throw new NotFoundException('Reward not found');

    return this.repository.updateRewardStatus(rewardId, dto);
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  async listAllClaims(page: number, limit: number, status?: string) {
    const [claims, total] = await this.repository.findClaims(page, limit, status);

    return {
      data: claims.map((c) => ({
        id:              c.id,
        userId:          c.userId,
        walletAddress:   c.wallet.address,
        rewardTitle:     c.reward.title,
        status:          c.status,
        transactionHash: c.transactions[0]?.hash ?? null,
        claimedAt:       c.claimedAt?.toISOString() ?? null,
        createdAt:       c.createdAt.toISOString(),
      })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async updateClaimStatus(claimId: string, dto: AdminUpdateClaimStatusDto) {
    const claim = await this.repository.findClaimById(claimId);
    if (!claim) throw new NotFoundException('Claim not found');

    if (!canTransitionClaimStatus(claim.status, dto.status)) {
      throw new BadRequestException(
        `Invalid claim transition ${claim.status} -> ${dto.status}`,
      );
    }

    return this.repository.updateClaimStatus(claimId, dto);
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  async getAuditLog(page: number, limit: number) {
    const [entries, total] = await this.repository.findAuditLog(page, limit);

    return {
      data: entries,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
