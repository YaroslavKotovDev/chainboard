import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import type { WalletRecord } from '@chainboard/types';

import { WalletAddressParamDto } from '../../common/dto/route-params.dto';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SetLabelDto } from './dto/set-label.dto';
import { WalletService } from './wallet.service';

@ApiTags('Wallets')
@Controller('wallets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'List all wallets for current user' })
  getWallets(@CurrentUser() user: JwtPayload): Promise<WalletRecord[]> {
    return this.walletService.getWallets(user.sub);
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get wallet detail with transaction history' })
  getWalletDetail(
    @Param() params: WalletAddressParamDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<WalletRecord & { transactions: unknown[] }> {
    return this.walletService.getWalletDetail(params.address, user.sub);
  }

  @Post(':address/label')
  @ApiOperation({ summary: 'Set a human-readable label for a wallet' })
  setLabel(
    @Param() params: WalletAddressParamDto,
    @CurrentUser() user: JwtPayload,
    @Body(ZodValidationPipe) dto: SetLabelDto,
  ): Promise<WalletRecord> {
    return this.walletService.setLabel(params.address, user.sub, dto.label);
  }
}
