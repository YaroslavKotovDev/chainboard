import { Injectable, NotFoundException } from '@nestjs/common';
import type { WalletRecord } from '@chainboard/types';

import { WalletRepository } from './wallet.repository';

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async getWallets(userId: string): Promise<WalletRecord[]> {
    const wallets = await this.walletRepository.findByUserId(userId);
    return wallets.map((w) => this.toRecord(w, w._count.transactions));
  }

  async getWalletDetail(
    address: string,
    userId: string,
  ): Promise<WalletRecord & { transactions: unknown[] }> {
    const wallet = await this.walletRepository.findByAddress(address, userId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    return {
      ...this.toRecord(wallet, wallet.transactions.length),
      transactions: wallet.transactions,
    };
  }

  async setLabel(address: string, userId: string, label: string): Promise<WalletRecord> {
    const existing = await this.walletRepository.findByAddress(address, userId);
    if (!existing) throw new NotFoundException('Wallet not found');

    const updated = await this.walletRepository.updateLabel(address, userId, label);
    return this.toRecord(updated, 0);
  }

  private toRecord(
    wallet: { id: string; address: string; chainId: number; isVerified: boolean; label: string | null; createdAt: Date; updatedAt: Date },
    transactionCount: number,
  ): WalletRecord {
    return {
      id: wallet.id,
      address: wallet.address,
      chainId: wallet.chainId,
      isVerified: wallet.isVerified,
      label: wallet.label,
      transactionCount,
      createdAt: wallet.createdAt.toISOString(),
    };
  }
}
