import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClaimIdParamDto, ResourceIdParamDto } from '../../common/dto/route-params.dto';
import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ClaimHistoryQueryDto,
  InitiateClaimDto,
  SubmitClaimTransactionDto,
} from './dto/rewards.dto';
import { RewardsService } from './rewards.service';

@ApiTags('Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List all rewards with per-user eligibility' })
  listRewards(@CurrentUser() user: JwtPayload) {
    return this.rewardsService.listRewards(user.sub);
  }

  @Get('claims')
  @Version('1')
  @ApiOperation({ summary: "Get current user's claim history" })
  getUserClaims(
    @CurrentUser() user: JwtPayload,
    @Query() query: ClaimHistoryQueryDto,
  ) {
    return this.rewardsService.getUserClaims(user.sub, query.status);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get reward detail with eligibility' })
  getReward(
    @Param() params: ResourceIdParamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rewardsService.getReward(params.id, user.sub);
  }

  @Post(':id/claim')
  @Version('1')
  @ApiOperation({ summary: 'Initiate a reward claim (creates PENDING claim)' })
  initiateClaim(
    @Param() params: ResourceIdParamDto,
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiateClaimDto,
  ) {
    return this.rewardsService.initiateClaim(user.sub, params.id, dto.walletAddress);
  }

  @Patch('claims/:claimId/submit')
  @Version('1')
  @ApiOperation({ summary: 'Submit transaction hash for a pending claim' })
  submitClaimTransaction(
    @Param() params: ClaimIdParamDto,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitClaimTransactionDto,
  ) {
    return this.rewardsService.submitClaimTransaction(
      user.sub,
      params.claimId,
      dto.transactionHash,
      dto.chainId,
    );
  }

  @Post('claims/:claimId/authorize')
  @Version('1')
  @ApiOperation({ summary: 'Generate operator EIP-712 signature for on-chain claim execution' })
  authorizeClaimSignature(
    @Param() params: ClaimIdParamDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rewardsService.authorizeClaimSignature(user.sub, params.claimId);
  }
}
