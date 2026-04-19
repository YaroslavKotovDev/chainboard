'use client';

import { useEffect, useState } from 'react';
import { Gift, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

import { LoadingTable } from '@chainboard/ui';
import { RewardCard } from '@/components/rewards/reward-card';
import { ClaimFlowDialog, type ClaimStep } from '@/components/rewards/claim-flow-dialog';
import {
  rewardKeys,
  useInitiateClaim,
  useRequestClaimSignature,
  useRewards,
  useSubmitClaimTransaction,
} from '@/hooks/use-rewards';
import { useClaimContract } from '@/hooks/use-claim-contract';
import { useWagmiReady } from '@/providers/web3-provider';
import type { RewardSummary } from '@chainboard/types';

function StatPill({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="font-mono text-lg font-bold text-zinc-100">{value}</p>
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function WagmiAccountWrapper({ onAddress }: { onAddress: (addr: string | undefined) => void }) {
  const { address } = useAccount();

  useEffect(() => {
    onAddress(address);
  }, [address, onAddress]);

  return null;
}

export default function RewardsPage() {
  const wagmiReady = useWagmiReady();
  const chainId = useChainId();
  const queryClient = useQueryClient();
  const [walletAddress, setWalletAddress] = useState<string | undefined>();
  const { data: rewards, isLoading, error } = useRewards();
  const initiateClaim = useInitiateClaim();
  const requestClaimSignature = useRequestClaimSignature();
  const submitClaimTransaction = useSubmitClaimTransaction();
  const claimContract = useClaimContract();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [claimStep, setClaimStep] = useState<ClaimStep>('confirm');
  const [activeReward, setActiveReward] = useState<RewardSummary | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const isClaimLoading =
    initiateClaim.isPending ||
    requestClaimSignature.isPending ||
    submitClaimTransaction.isPending ||
    claimContract.isLoading;

  useEffect(() => {
    if (claimContract.txHash) {
      setTxHash(claimContract.txHash);
      setClaimStep('pending');
    }
  }, [claimContract.txHash]);

  useEffect(() => {
    if (claimContract.step === 'confirmed') {
      setClaimStep('success');
      void queryClient.invalidateQueries({ queryKey: rewardKeys.list() });
      void queryClient.invalidateQueries({ queryKey: rewardKeys.claims() });
    }

    if (claimContract.step === 'error') {
      setClaimError(claimContract.error ?? 'Claim transaction failed');
      setClaimStep('error');
    }
  }, [claimContract.error, claimContract.step, queryClient]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setActiveReward(null);
    setClaimError(null);
    setTxHash(null);
    claimContract.reset();
  };

  const handleClaim = (rewardId: string) => {
    const reward = rewards?.find((r) => r.id === rewardId);
    if (!reward) return;
    setActiveReward(reward);
    setClaimStep('confirm');
    setClaimError(null);
    setTxHash(null);
    claimContract.reset();
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!activeReward || !walletAddress) return;

    setClaimStep('signing');
    setClaimError(null);
    setTxHash(null);

    try {
      const initiatedClaim = await initiateClaim.mutateAsync({
        rewardId: activeReward.id,
        walletAddress,
      });

      const authorization = await requestClaimSignature.mutateAsync({
        claimId: initiatedClaim.claimId,
      });

      const hash = await claimContract.executeOnChainClaim({
        recipient: authorization.recipient,
        amount: BigInt(authorization.amount),
        nonce: BigInt(authorization.nonce),
        deadline: BigInt(authorization.deadline),
        signature: authorization.signature,
      });

      if (!hash) {
        return;
      }

      setTxHash(hash);
      setClaimStep('pending');

      try {
        await submitClaimTransaction.mutateAsync({
          claimId: initiatedClaim.claimId,
          transactionHash: hash,
          chainId,
        });
      } catch (submissionError) {
        const message = submissionError instanceof Error
          ? submissionError.message
          : 'Transaction was sent, but backend tracking failed. Refresh the page shortly.';
        setClaimError(message);
      }
    } catch (err: unknown) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
      setClaimStep('error');
    }
  };

  const totalRewards  = rewards?.length ?? 0;
  const eligibleCount = rewards?.filter((r) => r.isEligible).length ?? 0;
  const claimedCount  = rewards?.filter((r) => r.userClaimStatus === 'CONFIRMED').length ?? 0;
  const pendingCount  = rewards?.filter((r) => r.userClaimStatus === 'PENDING' || r.userClaimStatus === 'SUBMITTED').length ?? 0;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {wagmiReady && <WagmiAccountWrapper onAddress={setWalletAddress} />}

      <div>
        <h2 className="text-2xl font-bold text-zinc-100">Rewards</h2>
        <p className="mt-1 text-sm text-zinc-500">Browse active programs and claim your rewards.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill icon={Gift}         label="Total Programs" value={totalRewards}  color="#3b82f6" />
        <StatPill icon={Sparkles}     label="Eligible Now"   value={eligibleCount} color="#10b981" />
        <StatPill icon={Clock}        label="In Progress"    value={pendingCount}  color="#f59e0b" />
        <StatPill icon={CheckCircle2} label="Claimed"        value={claimedCount}  color="#34d399" />
      </div>

      {isLoading ? (
        <LoadingTable rows={3} />
      ) : error ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(239,68,68,0.15)' }}>
          <p className="text-sm text-red-400">Failed to load rewards. Please try again.</p>
        </div>
      ) : !rewards?.length ? (
        <div className="rounded-xl p-12 text-center" style={{ background: 'rgb(17 17 20)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
          <Gift className="mx-auto h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-400">No rewards available</p>
          <p className="mt-1 text-xs text-zinc-600">Check back soon for new reward programs.</p>
        </div>
      ) : (
        <>
          {eligibleCount > 0 && (
            <div>
                <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" /> Eligible for you ({eligibleCount})
                </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rewards.filter((r) => r.isEligible).map((reward) => (
                  <RewardCard key={reward.id} reward={reward} onClaim={handleClaim} isClaimLoading={isClaimLoading && activeReward?.id === reward.id} />
                ))}
              </div>
            </div>
          )}
          {rewards.filter((r) => !r.isEligible).length > 0 && (
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                All Programs ({rewards.filter((r) => !r.isEligible).length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {rewards.filter((r) => !r.isEligible).map((reward) => (
                  <RewardCard key={reward.id} reward={reward} onClaim={handleClaim} isClaimLoading={isClaimLoading && activeReward?.id === reward.id} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeReward && (
        <ClaimFlowDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          step={claimStep}
          rewardTitle={activeReward.title}
          rewardAmount={activeReward.totalAmount}
          {...(walletAddress !== undefined && { walletAddress })}
          {...(txHash !== null && { transactionHash: txHash })}
          {...(claimError !== null && { errorMessage: claimError })}
          onConfirm={() => void handleConfirm()}
        />
      )}
    </div>
  );
}
