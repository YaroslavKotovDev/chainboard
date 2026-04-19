import { expect }          from 'chai';
import hre                  from 'hardhat';
import { parseUnits }       from 'ethers';
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import type {
  AccessRegistry,
  RewardVault,
  ClaimManager,
  MockERC20,
} from '../typechain-types';

const INITIAL_SUPPLY = parseUnits('1000000', 18);
const CLAIM_AMOUNT   = parseUnits('100',     18);

describe('ClaimManager', () => {
  let admin:       HardhatEthersSigner;
  let operator:    HardhatEthersSigner;
  let user:        HardhatEthersSigner;
  let other:       HardhatEthersSigner;

  let registry:     AccessRegistry;
  let token:        MockERC20;
  let vault:        RewardVault;
  let claimManager: ClaimManager;

  beforeEach(async () => {
    [admin, operator, user, other] = await hre.ethers.getSigners();

    // 1. AccessRegistry
    registry = await hre.ethers.deployContract('AccessRegistry', [admin.address]);

    // 2. Token + Vault
    token = await hre.ethers.deployContract('MockERC20', ['Test Token', 'TT', INITIAL_SUPPLY]);
    vault = await hre.ethers.deployContract('RewardVault', [
      await registry.getAddress(),
      await token.getAddress(),
    ]);

    // 3. ClaimManager
    claimManager = await hre.ethers.deployContract('ClaimManager', [
      await registry.getAddress(),
      await vault.getAddress(),
    ]);

    // 4. Bind
    await vault.setClaimManager(await claimManager.getAddress());

    // 5. Fund vault
    await token.approve(await vault.getAddress(), INITIAL_SUPPLY);
    await vault.deposit(parseUnits('10000', 18));

    // 6. Grant operator role to `operator` signer
    const OPERATOR_ROLE = await registry.OPERATOR_ROLE();
    await registry.connect(admin).grantRole(OPERATOR_ROLE, operator.address);
  });

  // ── helpers ──────────────────────────────────────────────────────────────
  async function buildSignature(
    signer:     HardhatEthersSigner,
    recipient:  string,
    amount:     bigint,
    nonce:      bigint,
    deadline:   bigint,
  ): Promise<string> {
    const domain = {
      name:              'ChainBoard',
      version:           '1',
      chainId:           (await hre.ethers.provider.getNetwork()).chainId,
      verifyingContract: await claimManager.getAddress(),
    };
    const types = {
      ClaimPayload: [
        { name: 'recipient', type: 'address' },
        { name: 'amount',    type: 'uint256' },
        { name: 'nonce',     type: 'uint256' },
        { name: 'deadline',  type: 'uint256' },
      ],
    };
    return signer.signTypedData(domain, types, { recipient, amount, nonce, deadline });
  }

  function futureDeadline(): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + 3600);
  }

  // ── tests ─────────────────────────────────────────────────────────────────
  describe('claim()', () => {
    it('transfers tokens to recipient on valid signature', async () => {
      const deadline  = futureDeadline();
      const sig       = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, deadline);
      const before    = await token.balanceOf(user.address);

      await claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig);

      expect(await token.balanceOf(user.address)).to.equal(before + CLAIM_AMOUNT);
    });

    it('increments nonce after successful claim', async () => {
      const deadline = futureDeadline();
      const sig0     = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, deadline);
      await claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig0);
      expect(await claimManager.nonces(user.address)).to.equal(1n);
    });

    it('reverts on nonce reuse (replay attack)', async () => {
      const deadline = futureDeadline();
      const sig      = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, deadline);
      await claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig);

      await expect(
        claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig),
      ).to.be.revertedWithCustomError(claimManager, 'InvalidNonce');
    });

    it('reverts on expired deadline', async () => {
      const pastDeadline = BigInt(Math.floor(Date.now() / 1000) - 1);
      const sig = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, pastDeadline);

      await expect(
        claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, pastDeadline, sig),
      ).to.be.revertedWithCustomError(claimManager, 'ExpiredDeadline');
    });

    it('reverts when signed by non-operator', async () => {
      const deadline = futureDeadline();
      const sig      = await buildSignature(other, user.address, CLAIM_AMOUNT, 0n, deadline);

      await expect(
        claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig),
      ).to.be.revertedWithCustomError(claimManager, 'InvalidSignature');
    });

    it('reverts on zero amount', async () => {
      const deadline = futureDeadline();
      const sig      = await buildSignature(operator, user.address, 0n, 0n, deadline);

      await expect(
        claimManager.connect(user).claim(user.address, 0n, 0n, deadline, sig),
      ).to.be.revertedWithCustomError(claimManager, 'ZeroAmount');
    });

    it('emits Claimed event with correct args', async () => {
      const deadline = futureDeadline();
      const sig      = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, deadline);

      await expect(
        claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig),
      ).to.emit(claimManager, 'Claimed').withArgs(
        user.address,
        CLAIM_AMOUNT,
        0n,
        // payloadHash is bytes32 — we don't check the exact value
        (v: unknown) => typeof v === 'string' && v.startsWith('0x'),
      );
    });

    it('tracks totalClaimed per wallet', async () => {
      const deadline = futureDeadline();
      const sig0     = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, deadline);
      await claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig0);

      const deadline2 = futureDeadline();
      const sig1      = await buildSignature(operator, user.address, CLAIM_AMOUNT, 1n, deadline2);
      await claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 1n, deadline2, sig1);

      expect(await claimManager.totalClaimed(user.address)).to.equal(CLAIM_AMOUNT * 2n);
    });
  });

  describe('pause', () => {
    it('admin can pause and unpause', async () => {
      await claimManager.connect(admin).pause();
      expect(await claimManager.paused()).to.be.true;
      await claimManager.connect(admin).unpause();
      expect(await claimManager.paused()).to.be.false;
    });

    it('reverts claim when paused', async () => {
      await claimManager.connect(admin).pause();
      const deadline = futureDeadline();
      const sig      = await buildSignature(operator, user.address, CLAIM_AMOUNT, 0n, deadline);

      await expect(
        claimManager.connect(user).claim(user.address, CLAIM_AMOUNT, 0n, deadline, sig),
      ).to.be.revertedWithCustomError(claimManager, 'EnforcedPause');
    });
  });
});
