/**
 * Generates a random UUID v4 request identifier.
 * Uses Web Crypto API (browser + Node 19+) for universal compatibility.
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Returns a promise that resolves after the specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamps a number between min and max values (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Returns the Base Sepolia block explorer URL for a given transaction hash.
 */
export function getExplorerTxUrl(txHash: string, chainId: number): string {
  const explorers: Record<number, string> = {
    84532: 'https://sepolia.basescan.org/tx',
    8453: 'https://basescan.org/tx',
    1: 'https://etherscan.io/tx',
  };
  const base = explorers[chainId] ?? 'https://sepolia.basescan.org/tx';
  return `${base}/${txHash}`;
}
