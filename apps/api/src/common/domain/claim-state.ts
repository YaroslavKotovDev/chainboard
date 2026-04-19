import type { ClaimStatus } from '@prisma/client';

export const CLAIM_STATUS_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  PENDING: ['SUBMITTED', 'REJECTED'],
  SUBMITTED: ['CONFIRMED', 'FAILED'],
  CONFIRMED: [],
  FAILED: ['PENDING'],
  REJECTED: [],
};

export function canTransitionClaimStatus(current: ClaimStatus, next: ClaimStatus): boolean {
  if (current === next) {
    return true;
  }

  return CLAIM_STATUS_TRANSITIONS[current].includes(next);
}
