import { Injectable } from '@nestjs/common';
import type { Role, User, Wallet } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type UserWithRelations = User & { role: Role | null; wallets: Wallet[] };

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true, wallets: true },
    });
  }

  async updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<User & { role: Role | null }> {
    return this.prisma.user.update({
      where: { id },
      data: { displayName },
      include: { role: true },
    });
  }
}
