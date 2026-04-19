import { Injectable } from '@nestjs/common';
import type { Session, User, Wallet } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

interface NonceRecord {
  nonce: string;
  address: string;
  chainId: number;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async storeNonce(address: string, chainId: number, nonce: string, expiresAt: Date): Promise<void> {
    await this.prisma.siweNonce.upsert({
      where: { address: address.toLowerCase() },
      create: {
        address: address.toLowerCase(),
        chainId,
        nonce,
        expiresAt,
      },
      update: {
        chainId,
        nonce,
        expiresAt,
        consumedAt: null,
      },
    });
  }

  async consumeNonce(address: string): Promise<NonceRecord | null> {
    const normalizedAddress = address.toLowerCase();

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.siweNonce.findUnique({
        where: { address: normalizedAddress },
      });

      if (!record || record.consumedAt) {
        return null;
      }

      const consumed = await tx.siweNonce.updateMany({
        where: {
          address: normalizedAddress,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      if (consumed.count === 0) {
        return null;
      }

      return {
        nonce: record.nonce,
        address: record.address,
        chainId: record.chainId,
        expiresAt: record.expiresAt,
      };
    });
  }

  async findUserByWalletAddress(
    address: string,
  ): Promise<(User & { role: { name: string } | null; wallets: Wallet[] }) | null> {
    return this.prisma.user.findFirst({
      where: {
        wallets: { some: { address: address.toLowerCase() } },
      },
      include: {
        role: true,
        wallets: true,
      },
    });
  }

  async createUser(): Promise<User & { role: { name: string } | null }> {
    return this.prisma.user.create({
      data: {
        role: {
          create: { name: 'USER' },
        },
      },
      include: { role: true },
    });
  }

  async upsertWallet(address: string, chainId: number, userId: string): Promise<Wallet> {
    return this.prisma.wallet.upsert({
      where: { address: address.toLowerCase() },
      create: {
        address: address.toLowerCase(),
        chainId,
        userId,
        isVerified: true,
      },
      update: {
        isVerified: true,
      },
    });
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    return this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  }

  async revokeSessionById(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async findActiveSessionByDbId(
    sessionId: string,
  ): Promise<(Session & { user: User & { role: { name: string } | null } }) | null> {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: { role: true },
        },
      },
    });
  }

  async findFirstWalletByUserId(
    userId: string,
  ): Promise<{ address: string } | null> {
    return this.prisma.wallet.findFirst({
      where: { userId },
      select: { address: true },
    });
  }

  async findActiveSessionById(sessionId: string): Promise<{ id: string } | null> {
    return this.prisma.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
  }
}
