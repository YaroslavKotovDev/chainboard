import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule }                     from '@nestjs/testing';

import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRepository = {
  countUsers: jest.fn(),
  countWallets: jest.fn(),
  countRewards: jest.fn(),
  countClaims: jest.fn(),
  countTransactions: jest.fn(),
  findUsers: jest.fn(),
  findUserDetail: jest.fn(),
  findAllRewards: jest.fn(),
  createReward: jest.fn(),
  findRewardById: jest.fn(),
  updateRewardStatus: jest.fn(),
  findClaims: jest.fn(),
  findClaimById: jest.fn(),
  updateClaimStatus: jest.fn(),
  findAuditLog: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
        providers: [
          AdminService,
          { provide: AdminRepository, useValue: mockRepository },
        ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ── getDashboardStats ──────────────────────────────────────────────────────

  describe('getDashboardStats()', () => {
    it('returns aggregated stats from all entities', async () => {
      mockRepository.countUsers.mockResolvedValue(10);
      mockRepository.countWallets.mockResolvedValue(8);
      mockRepository.countRewards.mockResolvedValue(3);
      mockRepository.countClaims
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(12); // confirmed
      mockRepository.countTransactions.mockResolvedValue(15);

      const stats = await service.getDashboardStats();

      expect(stats.users.total).toBe(10);
      expect(stats.users.withWallets).toBe(8);
      expect(stats.rewards.total).toBe(3);
      expect(stats.claims.total).toBe(20);
      expect(stats.claims.pending).toBe(5);
      expect(stats.claims.confirmed).toBe(12);
      expect(stats.transactions.total).toBe(15);
    });
  });

  // ── updateRewardStatus ─────────────────────────────────────────────────────

  describe('updateRewardStatus()', () => {
    it('updates reward status successfully', async () => {
      const reward = { id: 'r1', status: 'ACTIVE', title: 'T' };
      mockRepository.findRewardById.mockResolvedValue(reward);
      mockRepository.updateRewardStatus.mockResolvedValue({ ...reward, status: 'PAUSED' });

      const result = await service.updateRewardStatus('r1', { status: 'PAUSED' });
      expect(result.status).toBe('PAUSED');
    });

    it('throws NotFoundException for unknown reward', async () => {
      mockRepository.findRewardById.mockResolvedValue(null);
      await expect(service.updateRewardStatus('bad', { status: 'PAUSED' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── updateClaimStatus ──────────────────────────────────────────────────────

  describe('updateClaimStatus()', () => {
    it('updates claim status successfully', async () => {
      const claim = { id: 'c1', status: 'PENDING' };
      mockRepository.findClaimById.mockResolvedValue(claim);
      mockRepository.updateClaimStatus.mockResolvedValue({ ...claim, status: 'REJECTED' });

      const result = await service.updateClaimStatus('c1', { status: 'REJECTED' });
      expect(result.status).toBe('REJECTED');
    });

    it('throws NotFoundException for unknown claim', async () => {
      mockRepository.findClaimById.mockResolvedValue(null);
      await expect(service.updateClaimStatus('bad', { status: 'REJECTED' }))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when trying to modify CONFIRMED claim', async () => {
      mockRepository.findClaimById.mockResolvedValue({ id: 'c1', status: 'CONFIRMED' });
      await expect(service.updateClaimStatus('c1', { status: 'REJECTED' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── listUsers ──────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('returns paginated user list', async () => {
      mockRepository.findUsers.mockResolvedValue([
        [{ id: 'u1', wallets: [], role: { name: 'USER' }, _count: { claims: 2 }, createdAt: new Date() }],
        1,
      ]);

      const result = await service.listUsers(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });
});
