import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decimalToBigInt } from '@chainboard/utils';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbiItem,
  type Hex,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import { canTransitionClaimStatus } from '../../common/domain/claim-state';
import { RewardsRepository } from './rewards.repository';

// EIP-712 types for ClaimPayload (mirrors ClaimManager.sol)
const CLAIM_PAYLOAD_TYPES = {
  ClaimPayload: [
    { name: 'recipient', type: 'address' },
    { name: 'amount',    type: 'uint256' },
    { name: 'nonce',     type: 'uint256' },
    { name: 'deadline',  type: 'uint256' },
  ],
} as const;

const CLAIM_MANAGER_DOMAIN = (contractAddress: Address) => ({
  name:              'ChainBoard',
  version:           '1',
  chainId:           baseSepolia.id,
  verifyingContract: contractAddress,
});

const CLAIM_MANAGER_NONCES_ABI = [
  parseAbiItem('function nonces(address recipient) view returns (uint256)'),
] as const;

// Claim deadline: 10 minutes from now
const SIGNATURE_TTL_SECONDS = 600;

@Injectable()
export class RewardsService {
  constructor(
    private readonly repo: RewardsRepository,
    private readonly config: ConfigService,
  ) {}

  // ── Rewards ────────────────────────────────────────────────────────────────

  async listRewards(userId: string) {
    const [rewards, userClaims] = await Promise.all([
      this.repo.findAll(),
      this.repo.findClaimsByUser(userId),
    ]);

    const claimMap = new Map(
      userClaims.map((c) => [`${c.rewardId}`, c]),
    );

    const now = new Date();

    return rewards.map((reward) => {
      const userClaim = claimMap.get(reward.id) ?? null;
      const isActiveWindow =
        reward.status === 'ACTIVE' &&
        reward.startAt <= now &&
        reward.endAt >= now;
      const isEligible = isActiveWindow && !userClaim;

      return {
        id:              reward.id,
        title:           reward.title,
        description:     reward.description,
        status:          reward.status,
        totalAmount:     reward.totalAmount.toString(),
        claimedAmount:   reward.claimedAmount.toString(),
        startAt:         reward.startAt.toISOString(),
        endAt:           reward.endAt.toISOString(),
        isEligible,
        userClaimStatus: userClaim?.status ?? null,
      };
    });
  }

  async getReward(rewardId: string, userId: string) {
    const reward = await this.repo.findById(rewardId);
    if (!reward) throw new NotFoundException('Reward not found');

    const wallet = await this.repo.findFirstWalletByUserId(userId);
    const userClaim = wallet
      ? await this.repo.findClaimByUserAndRewardAndWallet(userId, rewardId, wallet.id)
      : null;

    const now = new Date();
    const isEligible =
      reward.status === 'ACTIVE' &&
      reward.startAt <= now &&
      reward.endAt >= now &&
      !userClaim;

    return {
      id:              reward.id,
      title:           reward.title,
      description:     reward.description,
      status:          reward.status,
      totalAmount:     reward.totalAmount.toString(),
      claimedAmount:   reward.claimedAmount.toString(),
      startAt:         reward.startAt.toISOString(),
      endAt:           reward.endAt.toISOString(),
      isEligible,
      userClaimStatus: userClaim?.status ?? null,
    };
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  async initiateClaim(userId: string, rewardId: string, walletAddress: string) {
    const reward = await this.repo.findById(rewardId);
    if (!reward) throw new NotFoundException('Reward not found');

    const now = new Date();
    if (
      reward.status !== 'ACTIVE' ||
      reward.startAt > now ||
      reward.endAt < now
    ) {
      throw new BadRequestException('Reward is not currently active');
    }

    // Look up the wallet by address and user
    const wallet = await this.repo.findWalletByUserAndAddress(userId, walletAddress);
    if (!wallet) throw new BadRequestException('Wallet not found for this user');

    // Check for duplicate claim
    const existing = await this.repo.findClaimByUserAndRewardAndWallet(
      userId, rewardId, wallet.id,
    );
    if (existing) {
      throw new ConflictException('You have already claimed this reward');
    }

    const claim = await this.repo.createClaim(userId, rewardId, wallet.id);

    return { claimId: claim.id, status: claim.status };
  }

  async submitClaimTransaction(
    userId: string,
    claimId: string,
    transactionHash: string,
    chainId: number,
  ) {
    const claim = await this.repo.findClaimById(claimId);
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.userId !== userId) throw new NotFoundException('Claim not found');
    if (!canTransitionClaimStatus(claim.status, 'SUBMITTED')) {
      throw new BadRequestException(`Claim cannot be submitted from status: ${claim.status}`);
    }

    const [updatedClaim, tx] = await Promise.all([
      this.repo.updateClaimStatus(claimId, 'SUBMITTED'),
      this.repo.createTransaction(claimId, claim.walletId, chainId, transactionHash),
    ]);

    return {
      claimId:         updatedClaim.id,
      status:          updatedClaim.status,
      transactionHash: tx.hash,
    };
  }

  // ── Authorize claim (EIP-712 operator signature) ───────────────────────────

  async authorizeClaimSignature(userId: string, claimId: string) {
    const claim = await this.repo.findClaimById(claimId);
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.userId !== userId) throw new NotFoundException('Claim not found');
    if (claim.status !== 'PENDING') {
      throw new BadRequestException(`Claim must be PENDING to authorize, current: ${claim.status}`);
    }

    // Resolve the wallet receiving the reward
    const wallet = await this.repo.findWalletById(claim.walletId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    // Operator private key — must be set in env for production
    const operatorPrivateKey = this.config.get<string>('OPERATOR_PRIVATE_KEY');
    if (!operatorPrivateKey) {
      throw new InternalServerErrorException('Operator key not configured');
    }

    // ClaimManager contract address
    const claimManagerAddress = this.config.get<string>('CLAIM_MANAGER_ADDRESS') as Address | undefined;
    if (!claimManagerAddress) {
      throw new InternalServerErrorException('ClaimManager address not configured');
    }

    const transport = http(
      this.config.get<string>('RPC_URL_BASE_SEPOLIA') ?? 'https://sepolia.base.org',
    );
    const account = privateKeyToAccount(operatorPrivateKey as Hex);
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport,
    });
    const signingClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    });

    // Amount from reward in token base units, preserving 18-decimal precision.
    const amount = decimalToBigInt(claim.reward.totalAmount.toString(), 18);
    const nonce = await publicClient.readContract({
      address: claimManagerAddress,
      abi: CLAIM_MANAGER_NONCES_ABI,
      functionName: 'nonces',
      args: [wallet.address as Address],
    });
    const deadline  = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SECONDS);

    const signature = await signingClient.signTypedData({
      domain:      CLAIM_MANAGER_DOMAIN(claimManagerAddress),
      types:       CLAIM_PAYLOAD_TYPES,
      primaryType: 'ClaimPayload',
      message: {
        recipient: wallet.address as Address,
        amount,
        nonce,
        deadline,
      },
    });

    // Persist deadline + nonce for later verification
    await this.repo.updateClaimAuthorization(claimId, {
      signature,
      nonce:    Number(nonce),
      deadline: new Date(Number(deadline) * 1000),
    });

    return {
      claimId:   claim.id,
      recipient: wallet.address as `0x${string}`,
      amount:    amount.toString(),
      nonce:     nonce.toString(),
      deadline:  deadline.toString(),
      signature,
    };
  }

  async getUserClaims(userId: string, status?: string) {
    const claims = await this.repo.findClaimsByUser(
      userId,
      status as any,
    );

    return claims.map((c) => ({
      id:              c.id,
      rewardId:        c.rewardId,
      rewardTitle:     c.reward.title,
      walletAddress:   c.wallet.address,
      status:          c.status,
      transactionHash: c.transactions[0]?.hash ?? null,
      claimedAt:       c.claimedAt?.toISOString() ?? null,
      createdAt:       c.createdAt.toISOString(),
    }));
  }
}
