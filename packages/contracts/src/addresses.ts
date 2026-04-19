/**
 * Deployed contract addresses by chain ID.
 * Populated from deployments/{chainId}.json after Phase 12.
 */
export const CONTRACT_ADDRESSES: Record<number, {
  rewardVault: `0x${string}`;
  claimManager: `0x${string}`;
  accessRegistry: `0x${string}`;
}> = {
  // Base Sepolia (staging) — addresses set after deploy
  84532: {
    rewardVault: '0x0000000000000000000000000000000000000000',
    claimManager: '0x0000000000000000000000000000000000000000',
    accessRegistry: '0x0000000000000000000000000000000000000000',
  },
};

export function getContractAddresses(chainId: number) {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`No contract addresses configured for chain ${chainId}`);
  }
  return addresses;
}
