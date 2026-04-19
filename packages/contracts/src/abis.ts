/**
 * Contract ABIs — extracted from Hardhat compilation artifacts.
 * Re-run `pnpm compile` in packages/contracts to regenerate.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RewardVaultAbi    = require('../abis/RewardVault.json')    as readonly unknown[];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ClaimManagerAbi   = require('../abis/ClaimManager.json')   as readonly unknown[];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AccessRegistryAbi = require('../abis/AccessRegistry.json') as readonly unknown[];

export const REWARD_VAULT_ABI     = RewardVaultAbi    as typeof RewardVaultAbi;
export const CLAIM_MANAGER_ABI    = ClaimManagerAbi   as typeof ClaimManagerAbi;
export const ACCESS_REGISTRY_ABI  = AccessRegistryAbi as typeof AccessRegistryAbi;
