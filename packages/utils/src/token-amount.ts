const DECIMAL_PATTERN = /^(?<sign>-)?(?<whole>\d+)(?:\.(?<fraction>\d+))?$/;

/**
 * Converts a base-10 decimal string into an integer bigint with fixed decimals.
 * This is deterministic and avoids Number/float precision loss for token amounts.
 */
export function decimalToBigInt(value: string, decimals = 18): bigint {
  const match = DECIMAL_PATTERN.exec(value.trim());
  if (!match?.groups) {
    throw new Error(`Invalid decimal value: ${value}`);
  }

  const sign = match.groups.sign ? -1n : 1n;
  const whole = match.groups.whole;
  const fraction = match.groups.fraction ?? '';

  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) {
    throw new Error(
      `Value ${value} has more than ${decimals} decimal places and would lose precision`,
    );
  }

  const normalizedFraction = fraction.slice(0, decimals).padEnd(decimals, '0');
  const units = BigInt(`${whole}${normalizedFraction}`);

  return units * sign;
}

/**
 * Converts a fixed-decimal bigint into a normalized base-10 decimal string.
 */
export function bigIntToDecimalString(value: bigint, decimals = 18): string {
  const isNegative = value < 0n;
  const absoluteValue = isNegative ? -value : value;
  const precision = 10n ** BigInt(decimals);
  const whole = absoluteValue / precision;
  const fraction = (absoluteValue % precision)
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  const normalized = fraction.length > 0 ? `${whole.toString()}.${fraction}` : whole.toString();
  return isNegative ? `-${normalized}` : normalized;
}
