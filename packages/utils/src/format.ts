/**
 * Truncates an Ethereum address to the format: 0x1234...abcd
 */
export function formatWalletAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Formats an ISO timestamp string to a human-readable date/time.
 */
export function formatTimestamp(iso: string, locale = 'en-US'): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formats a numeric value with a token symbol (e.g. "1,250.50 ETH").
 */
export function formatCurrency(value: number, symbol: string, decimals = 2): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${formatted} ${symbol}`;
}

/**
 * Formats a percentage value (e.g. 87.5 → "87.50%").
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a large number with K/M/B suffixes (e.g. 1500 → "1.5K").
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}
