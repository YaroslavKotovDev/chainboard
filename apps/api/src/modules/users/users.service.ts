import { Injectable, NotFoundException } from '@nestjs/common';
import type { RoleName, UserProfile } from '@chainboard/types';

import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      displayName: user.displayName,
      role: (user.role?.name ?? 'USER') as RoleName,
      walletCount: user.wallets.length,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, displayName: string): Promise<UserProfile> {
    const existing = await this.usersRepository.findById(userId);
    if (!existing) throw new NotFoundException('User not found');

    const updated = await this.usersRepository.updateDisplayName(userId, displayName);

    return {
      id: updated.id,
      displayName: updated.displayName,
      role: (updated.role?.name ?? 'USER') as RoleName,
      walletCount: existing.wallets.length,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
