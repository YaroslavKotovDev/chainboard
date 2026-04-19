import hre from 'hardhat';
import { parseUnits } from 'ethers';
import { mkdirSync, writeFileSync } from 'node:fs';
// parseUnits doesn't support numeric separator literals — use plain strings

/**
 * Deployment script for ChainBoard protocol contracts.
 *
 * Deploy order:
 *   1. AccessRegistry  (role management)
 *   2. RewardVault     (token custody)
 *   3. ClaimManager    (claim execution)
 *   4. Bind ClaimManager → RewardVault
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network localhost
 *   npx hardhat run scripts/deploy.ts --network baseSepolia
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\nDeploying ChainBoard contracts`);
  console.log(`Network  : ${hre.network.name}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Balance  : ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // ── 1. AccessRegistry ─────────────────────────────────────────────────────
  console.log('1/4  Deploying AccessRegistry...');
  const AccessRegistry = await hre.ethers.getContractFactory('AccessRegistry');
  const registry = await AccessRegistry.deploy(deployer.address);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log(`     ✓ AccessRegistry : ${registryAddr}`);

  // ── 2. Mock ERC-20 (local only) + RewardVault ─────────────────────────────
  let tokenAddr: string;

  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    console.log('2/4  Deploying MockERC20 (local only)...');
    const MockERC20 = await hre.ethers.getContractFactory('MockERC20');
    const token = await MockERC20.deploy('ChainBoard Token', 'CBT', parseUnits('10000000', 18)); // 10M tokens
    await token.waitForDeployment();
    tokenAddr = await token.getAddress();
    console.log(`     ✓ MockERC20    : ${tokenAddr}`);
  } else {
    tokenAddr = process.env.REWARD_TOKEN_ADDRESS ?? '';
    if (!tokenAddr) throw new Error('REWARD_TOKEN_ADDRESS env var required for non-local deploy');
    console.log(`2/4  Using existing token : ${tokenAddr}`);
  }

  console.log('3/4  Deploying RewardVault...');
  const RewardVault = await hre.ethers.getContractFactory('RewardVault');
  const vault = await RewardVault.deploy(registryAddr, tokenAddr);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`     ✓ RewardVault  : ${vaultAddr}`);

  // ── 3. ClaimManager ───────────────────────────────────────────────────────
  console.log('4/4  Deploying ClaimManager...');
  const ClaimManager = await hre.ethers.getContractFactory('ClaimManager');
  const claimManager = await ClaimManager.deploy(registryAddr, vaultAddr);
  await claimManager.waitForDeployment();
  const claimManagerAddr = await claimManager.getAddress();
  console.log(`     ✓ ClaimManager : ${claimManagerAddr}`);

  // ── 4. Bind ───────────────────────────────────────────────────────────────
  console.log('\nBinding ClaimManager to RewardVault...');
  const bindTx = await vault.setClaimManager(claimManagerAddr);
  await bindTx.wait();
  console.log('     ✓ ClaimManager bound to RewardVault');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────');
  console.log('Deployment summary');
  console.log('─────────────────────────────────────────────────────');
  console.log(`AccessRegistry : ${registryAddr}`);
  console.log(`RewardToken    : ${tokenAddr}`);
  console.log(`RewardVault    : ${vaultAddr}`);
  console.log(`ClaimManager   : ${claimManagerAddr}`);
  console.log('─────────────────────────────────────────────────────\n');

  const deployment = {
    chainId,
    network: hre.network.name,
    accessRegistry: registryAddr,
    rewardToken: tokenAddr,
    rewardVault: vaultAddr,
    claimManager: claimManagerAddr,
  };
  mkdirSync(new URL('../deployments', import.meta.url), { recursive: true });
  writeFileSync(
    new URL(`../deployments/${chainId}.json`, import.meta.url),
    `${JSON.stringify(deployment, null, 2)}\n`,
  );

  const existingModule = await import('../src/addresses');
  const nextAddresses = {
    ...existingModule.CONTRACT_ADDRESSES,
    [chainId]: {
      rewardVault: vaultAddr,
      claimManager: claimManagerAddr,
      accessRegistry: registryAddr,
    },
  };
  writeFileSync(
    new URL('../src/addresses.ts', import.meta.url),
    `/**\n * Deployed contract addresses by chain ID.\n * Auto-generated from packages/contracts/deployments/*.json.\n */\nexport const CONTRACT_ADDRESSES: Record<number, {\n  rewardVault: \`0x\${string}\`;\n  claimManager: \`0x\${string}\`;\n  accessRegistry: \`0x\${string}\`;\n}> = ${JSON.stringify(nextAddresses, null, 2)};\n\nexport function getContractAddresses(chainId: number) {\n  const addresses = CONTRACT_ADDRESSES[chainId];\n  if (!addresses) {\n    throw new Error(\`No contract addresses configured for chain \${chainId}\`);\n  }\n  return addresses;\n}\n`,
  );
  console.log(`deployments/${chainId}.json written`);
  console.log('src/addresses.ts updated');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
