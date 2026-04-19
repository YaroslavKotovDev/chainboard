'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useChainId,
} from 'wagmi';
import { type Address, type Hex } from 'viem';

import { CLAIM_MANAGER_ABI } from '@chainboard/contracts';
import { getContractAddresses } from '@chainboard/contracts';

// ─── types ────────────────────────────────────────────────────────────────────

export type ClaimContractStep =
  | 'idle'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'error';

export interface ClaimContractState {
  step:        ClaimContractStep;
  txHash:      Hex | undefined;
  error:       string | undefined;
  isLoading:   boolean;
}

export interface UseClaimContractReturn extends ClaimContractState {
  executeOnChainClaim: (params: OnChainClaimParams) => Promise<Hex | undefined>;
  reset: () => void;
}

export interface OnChainClaimParams {
  /** Wallet address receiving the reward. */
  recipient:  Address;
  /** Token amount in wei (bigint). */
  amount:     bigint;
  /** Nonce from ClaimManager.nonces(recipient). */
  nonce:      bigint;
  /** Unix timestamp deadline. */
  deadline:   bigint;
  /** EIP-712 signature produced by the operator key (from API). */
  signature:  Hex;
}

// ─── hook ─────────────────────────────────────────────────────────────────────

/**
 * useClaimContract
 *
 * Wraps the ClaimManager.claim() write transaction lifecycle.
 * Provides a clean state machine: idle → signing → broadcasting → confirming → confirmed.
 *
 * The caller is responsible for obtaining a valid operator signature from the
 * backend API before calling executeOnChainClaim().
 */
export function useClaimContract(): UseClaimContractReturn {
  const chainId    = useChainId();
  const { address } = useAccount();

  const [step,  setStep]  = useState<ClaimContractStep>('idle');
  const [error, setError] = useState<string | undefined>();

  // wagmi write + receipt hooks
  const {
    writeContractAsync,
    data: txHash,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isReceiptSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  useEffect(() => {
    if (isReceiptSuccess && step === 'confirming') {
      setStep('confirmed');
    }
  }, [isReceiptSuccess, step]);

  useEffect(() => {
    if (isReceiptError) {
      setError(parseContractError(receiptError));
      setStep('error');
    }
  }, [isReceiptError, receiptError]);

  // ── core function ────────────────────────────────────────────────────────
  const executeOnChainClaim = useCallback(
    async (params: OnChainClaimParams) => {
      if (!address) {
        setError('Wallet not connected');
        setStep('error');
        return;
      }

      let claimManagerAddr: Address;
      try {
        claimManagerAddr = getContractAddresses(chainId).claimManager;
      } catch {
        setError(`Unsupported network (chainId ${chainId})`);
        setStep('error');
        return;
      }

      try {
        setStep('signing');
        setError(undefined);

        const hash = await writeContractAsync({
          address:      claimManagerAddr,
          abi:          CLAIM_MANAGER_ABI as never[],
          functionName: 'claim',
          args: [
            params.recipient,
            params.amount,
            params.nonce,
            params.deadline,
            params.signature,
          ],
        });

        setStep('confirming');
        return hash;
      } catch (err: unknown) {
        const message = parseContractError(err);
        setError(message);
        setStep('error');
        return undefined;
      } 
    },
    [address, chainId, writeContractAsync],
  );

  const reset = useCallback(() => {
    setStep('idle');
    setError(undefined);
    resetWrite();
  }, [resetWrite]);

  return {
    step:      isConfirming && step === 'confirming' ? 'confirming' : step,
    txHash,
    error,
    isLoading: step === 'signing' || step === 'broadcasting' || step === 'confirming',
    executeOnChainClaim,
    reset,
  };
}

// ─── useClaimNonce ────────────────────────────────────────────────────────────

/**
 * Reads the current nonce for an address from ClaimManager.
 * Used to validate that the backend-issued nonce matches on-chain state.
 */
export function useClaimNonce(recipient: Address | undefined): bigint | undefined {
  const chainId = useChainId();

  let claimManagerAddr: Address | undefined;
  try {
    claimManagerAddr = getContractAddresses(chainId).claimManager;
  } catch {
    claimManagerAddr = undefined;
  }

  const { data } = useReadContract({
    address:      claimManagerAddr,
    abi:          CLAIM_MANAGER_ABI as never[],
    functionName: 'nonces',
    args:         recipient ? [recipient] : undefined,
    query:        { enabled: !!recipient && !!claimManagerAddr },
  });

  return data as bigint | undefined;
}

// ─── useClaimTotalClaimed ─────────────────────────────────────────────────────

/**
 * Reads the total lifetime tokens claimed by a wallet from ClaimManager.
 */
export function useTotalClaimed(recipient: Address | undefined): bigint | undefined {
  const chainId = useChainId();

  let claimManagerAddr: Address | undefined;
  try {
    claimManagerAddr = getContractAddresses(chainId).claimManager;
  } catch {
    claimManagerAddr = undefined;
  }

  const { data } = useReadContract({
    address:      claimManagerAddr,
    abi:          CLAIM_MANAGER_ABI as never[],
    functionName: 'totalClaimed',
    args:         recipient ? [recipient] : undefined,
    query:        { enabled: !!recipient && !!claimManagerAddr },
  });

  return data as bigint | undefined;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseContractError(err: unknown): string {
  if (err instanceof Error) {
    // User rejected transaction in wallet
    if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
      return 'Transaction rejected in wallet.';
    }
    // Contract revert with reason
    const revertMatch = err.message.match(/reverted with reason string '(.+?)'/);
    if (revertMatch?.[1]) return revertMatch[1];
    // Custom error
    const customMatch = err.message.match(/reverted with custom error '(.+?)'/);
    if (customMatch?.[1]) return customMatch[1];

    return err.message.slice(0, 120);
  }
  return 'Unknown contract error.';
}
