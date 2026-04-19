import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RoleName } from '@chainboard/types';
import { getAddress, isAddress } from 'viem';
import { SiweMessage } from 'siwe';

import type { AppConfig } from '../../config/configuration';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuthRepository } from './auth.repository';

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
}

export interface AuthUser {
  id: string;
  address: string;
  role: RoleName;
  displayName: string | null;
}

export interface VerifyResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly jwtExpiresIn: string;
  private readonly siweNonceExpirySeconds: number;
  private readonly siweDomain: string;

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    this.jwtExpiresIn = this.config.get('JWT_EXPIRES_IN', { infer: true });
    this.siweNonceExpirySeconds = this.config.get('SIWE_NONCE_EXPIRY_SECONDS', { infer: true });
    this.siweDomain = this.config.get('SIWE_DOMAIN', { infer: true });
  }

  async generateNonce(address: string, chainId: number): Promise<NonceResponse> {
    if (!isAddress(address)) {
      throw new BadRequestException('Invalid Ethereum address');
    }

    const checksummed = getAddress(address);
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + this.siweNonceExpirySeconds * 1000);

    await this.authRepository.storeNonce(checksummed, chainId, nonce, expiresAt);

    return { nonce, expiresAt: expiresAt.toISOString() };
  }

  async verifySignature(
    message: string,
    signature: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<VerifyResponse> {
    let siweMessage: SiweMessage;

    try {
      siweMessage = new SiweMessage(message);
    } catch {
      throw new BadRequestException('Invalid SIWE message format');
    }

    const { success, error } = await siweMessage.verify({ signature });
    if (!success) {
      throw new UnauthorizedException(`Signature verification failed: ${error?.type ?? 'unknown'}`);
    }

    const { address, domain, nonce: messageNonce, chainId } = siweMessage;

    if (domain !== this.siweDomain) {
      throw new UnauthorizedException('Domain mismatch');
    }

    const storedNonce = await this.authRepository.consumeNonce(address);

    if (!storedNonce) {
      throw new UnauthorizedException('Nonce not found or already used');
    }

    if (storedNonce.nonce !== messageNonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }

    if (storedNonce.chainId !== chainId) {
      throw new UnauthorizedException('Chain mismatch');
    }

    if (storedNonce.expiresAt < new Date()) {
      throw new UnauthorizedException('Nonce expired');
    }

    const checksummedAddress = getAddress(address);

    // Find existing user or create new one
    const existingUser = await this.authRepository.findUserByWalletAddress(checksummedAddress);

    let userId: string;
    let displayName: string | null;
    let roleName: RoleName;

    if (existingUser) {
      userId = existingUser.id;
      displayName = existingUser.displayName;
      roleName = (existingUser.role?.name ?? 'USER') as RoleName;
    } else {
      const newUser = await this.authRepository.createUser();
      userId = newUser.id;
      displayName = newUser.displayName;
      roleName = (newUser.role?.name ?? 'USER') as RoleName;
    }

    await this.authRepository.upsertWallet(checksummedAddress, storedNonce.chainId, userId);

    const expiresAt = this.parseJwtExpiry(this.jwtExpiresIn);
    const sessionId = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(sessionId);

    const session = await this.authRepository.createSession(
      userId,
      tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    );

    const payload: JwtPayload = {
      sub: userId,
      address: checksummedAddress,
      sessionId: session.id,
      role: roleName,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: userId, address: checksummedAddress, role: roleName, displayName },
    };
  }

  async getSession(sessionId: string): Promise<AuthUser | null> {
    // sessionId is the DB session.id stored in the JWT payload
    const session = await this.authRepository.findActiveSessionByDbId(sessionId);
    if (!session) return null;

    const { user } = session;
    const roleName = (user.role?.name ?? 'USER') as RoleName;
    const primaryAddress = await this.getPrimaryAddress(user.id);

    return {
      id: user.id,
      address: primaryAddress,
      role: roleName,
      displayName: user.displayName,
    };
  }

  async logout(sessionId: string): Promise<void> {
    // Revoke by DB session ID
    await this.authRepository.revokeSessionById(sessionId);
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async getPrimaryAddress(userId: string): Promise<string> {
    const wallet = await this.authRepository.findFirstWalletByUserId(userId);
    if (!wallet) throw new InternalServerErrorException('No wallet found for user');
    return wallet.address;
  }

  private parseJwtExpiry(expiresIn: string): Date {
    const now = Date.now();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(now + 86400000);

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };

    return new Date(now + value * (multipliers[unit] ?? 86400000));
  }
}
