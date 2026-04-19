/**
 * Returns true if the value is a valid checksummed or lowercased Ethereum address.
 */
export function isEthAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Returns true if the value is a valid transaction hash (32 bytes hex).
 */
export function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * Returns true if the value is a valid Prisma cuid() identifier.
 */
export function isCuid(value: string): boolean {
  return /^c[0-9a-z]{24}$/i.test(value);
}

/**
 * Backward-compatible alias kept to avoid breaking older imports while IDs migrate from UUID to cuid.
 */
export const isUuid = isCuid;
