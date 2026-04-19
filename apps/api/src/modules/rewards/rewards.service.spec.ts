import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { RewardsRepository } from './rewards.repository';
import { RewardsService }    from './rewards.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockReward = (overrides = {}) => ({
  id:            'reward-1',
  title:         'Test Reward',
  description:   'desc',
  status:        'ACTIVE',
  totalAmount:   { toString: () => '1000' },
  claimedAmount: { toString: () => '0' },
  startAt:       new Date(Date.now() - 1000),
  endAt:         new Date(Date.now() + 86400_000),
  createdAt:     new Date(),
  updatedAt:     new Date(),
  ...overrides,
});

const mockWallet = (overrides = {}) => ({
  id:        'wallet-1',
  address:   '0xabc',
  userId:    'user-1',
  chainId:   84532,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const mockClaim = (overrides = {}) => ({
  id:        'claim-1',
  userId:    'user-1',
  rewardId:  'reward-1',
  walletId:  'wallet-1',
  status:    'PENDING',
  nonce:     null,
  deadline:  null,
  signature: null,
  claimedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  reward:    mockReward(),
  wallet:    mockWallet(),
  transactions: [],
  ...overrides,
});

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRepo: jest.Mocked<Partial<RewardsRepository>> = {
  findAll:                              jest.fn(),
  findById:                             jest.fn(),
  findClaimsByUser:                     jest.fn(),
  findClaimByUserAndRewardAndWallet:    jest.fn(),
  findFirstWalletByUserId:              jest.fn(),
  findWalletByUserAndAddress:           jest.fn(),
  findWalletById:                       jest.fn(),
  findClaimById:                        jest.fn(),
  createClaim:                          jest.fn(),
  updateClaimStatus:                    jest.fn(),
  createTransaction:                    jest.fn(),
  updateClaimAuthorization:             jest.fn(),
};

const mockConfig: jest.Mocked<Partial<ConfigService>> = {
  get: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RewardsService', () => {
  let service: RewardsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        { provide: RewardsRepository, useValue: mockRepo },
        { provide: ConfigService,     useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
  });

  // ── listRewards ────────────────────────────────────────────────────────────

  describe('listRewards()', () => {
    it('returns mapped rewards with eligibility flags', async () => {
      (mockRepo.findAll as jest.Mock).mockResolvedValue([mockReward()]);
      (mockRepo.findClaimsByUser as jest.Mock).mockResolvedValue([]);

      const result = await service.listRewards('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id:        'reward-1',
        isEligible: true,
        userClaimStatus: null,
      });
    });

    it('marks reward as not eligible when user has a claim', async () => {
      (mockRepo.findAll as jest.Mock).mockResolvedValue([mockReward()]);
      (mockRepo.findClaimsByUser as jest.Mock).mockResolvedValue([
        mockClaim({ rewardId: 'reward-1' }),
      ]);

      const result = await service.listRewards('user-1');
      expect(result[0]?.isEligible).toBe(false);
      expect(result[0]?.userClaimStatus).toBe('PENDING');
    });

    it('marks reward as not eligible when outside window', async () => {
      const expiredReward = mockReward({ endAt: new Date(Date.now() - 1000) });
      (mockRepo.findAll as jest.Mock).mockResolvedValue([expiredReward]);
      (mockRepo.findClaimsByUser as jest.Mock).mockResolvedValue([]);

      const result = await service.listRewards('user-1');
      expect(result[0]?.isEligible).toBe(false);
    });
  });

  // ── initiateClaim ──────────────────────────────────────────────────────────

  describe('initiateClaim()', () => {
    it('creates a PENDING claim successfully', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(mockReward());
      (mockRepo.findWalletByUserAndAddress as jest.Mock).mockResolvedValue(mockWallet());
      (mockRepo.findClaimByUserAndRewardAndWallet as jest.Mock).mockResolvedValue(null);
      (mockRepo.createClaim as jest.Mock).mockResolvedValue(mockClaim());

      const result = await service.initiateClaim('user-1', 'reward-1', '0xabc');
      expect(result).toMatchObject({ claimId: 'claim-1', status: 'PENDING' });
    });

    it('throws NotFoundException if reward not found', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(null);
      await expect(service.initiateClaim('user-1', 'bad-id', '0xabc'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if reward not active', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(mockReward({ status: 'PAUSED' }));
      await expect(service.initiateClaim('user-1', 'reward-1', '0xabc'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if wallet not found', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(mockReward());
      (mockRepo.findWalletByUserAndAddress as jest.Mock).mockResolvedValue(null);
      await expect(service.initiateClaim('user-1', 'reward-1', '0xabc'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if claim already exists', async () => {
      (mockRepo.findById as jest.Mock).mockResolvedValue(mockReward());
      (mockRepo.findWalletByUserAndAddress as jest.Mock).mockResolvedValue(mockWallet());
      (mockRepo.findClaimByUserAndRewardAndWallet as jest.Mock).mockResolvedValue(mockClaim());
      await expect(service.initiateClaim('user-1', 'reward-1', '0xabc'))
        .rejects.toThrow(ConflictException);
    });
  });

  // ── submitClaimTransaction ─────────────────────────────────────────────────

  describe('submitClaimTransaction()', () => {
    it('updates claim to SUBMITTED and creates transaction', async () => {
      (mockRepo.findClaimById as jest.Mock).mockResolvedValue(mockClaim());
      (mockRepo.updateClaimStatus as jest.Mock).mockResolvedValue(mockClaim({ status: 'SUBMITTED' }));
      (mockRepo.createTransaction as jest.Mock).mockResolvedValue({ hash: '0xdeadbeef' });

      const result = await service.submitClaimTransaction('user-1', 'claim-1', '0xdeadbeef', 84532);
      expect(result.status).toBe('SUBMITTED');
      expect(result.transactionHash).toBe('0xdeadbeef');
    });

    it('throws NotFoundException if claim not found', async () => {
      (mockRepo.findClaimById as jest.Mock).mockResolvedValue(null);
      await expect(service.submitClaimTransaction('user-1', 'bad-id', '0xhash', 1))
        .rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if claim not PENDING', async () => {
      (mockRepo.findClaimById as jest.Mock).mockResolvedValue(mockClaim({ status: 'CONFIRMED' }));
      await expect(service.submitClaimTransaction('user-1', 'claim-1', '0xhash', 1))
        .rejects.toThrow(BadRequestException);
    });
  });
});
