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

import { CurrentUser, type JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles }                          from '../../common/decorators/roles.decorator';
import { JwtAuthGuard }                 from '../auth/jwt-auth.guard';
import { AdminService }                 from './admin.service';
import {
  AdminClaimsQueryDto,
  AdminCreateRewardDto,
  AdminPaginationQueryDto,
  AdminResourceIdParamDto,
  AdminUpdateClaimStatusDto,
  AdminUpdateRewardStatusDto,
  AdminUserQueryDto,
} from './dto/admin.dto';

/**
 * AdminController
 *
 * All routes require JWT authentication and ADMIN role authorization.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────────

  @Get('stats')
  @Version('1')
  @ApiOperation({ summary: 'Get dashboard overview stats' })
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @Version('1')
  @ApiOperation({ summary: 'List all users with wallets and claim counts' })
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.adminService.listUsers(query.page, query.limit, query.search);
  }

  @Get('users/:id')
  @Version('1')
  @ApiOperation({ summary: 'Get user detail with wallets and recent claims' })
  getUserDetail(@Param() params: AdminResourceIdParamDto) {
    return this.adminService.getUserDetail(params.id);
  }

  // ── Rewards ────────────────────────────────────────────────────────────────

  @Get('rewards')
  @Version('1')
  @ApiOperation({ summary: 'List all reward programs' })
  listAllRewards() {
    return this.adminService.listAllRewards();
  }

  @Post('rewards')
  @Version('1')
  @ApiOperation({ summary: 'Create a new reward program' })
  createReward(
    @Body() dto: AdminCreateRewardDto,
    @CurrentUser() _user: JwtPayload,
  ) {
    return this.adminService.createReward(dto);
  }

  @Patch('rewards/:id/status')
  @Version('1')
  @ApiOperation({ summary: 'Update reward status (ACTIVE, PAUSED, EXPIRED)' })
  updateRewardStatus(
    @Param() params: AdminResourceIdParamDto,
    @Body() dto: AdminUpdateRewardStatusDto,
  ) {
    return this.adminService.updateRewardStatus(params.id, dto);
  }

  // ── Claims ─────────────────────────────────────────────────────────────────

  @Get('claims')
  @Version('1')
  @ApiOperation({ summary: 'List all claims with pagination and status filter' })
  listAllClaims(@Query() query: AdminClaimsQueryDto) {
    return this.adminService.listAllClaims(query.page, query.limit, query.status);
  }

  @Patch('claims/:id/status')
  @Version('1')
  @ApiOperation({ summary: 'Manually override a claim status' })
  updateClaimStatus(
    @Param() params: AdminResourceIdParamDto,
    @Body() dto: AdminUpdateClaimStatusDto,
  ) {
    return this.adminService.updateClaimStatus(params.id, dto);
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  @Get('audit-log')
  @Version('1')
  @ApiOperation({ summary: 'Get paginated audit log' })
  getAuditLog(@Query() query: AdminPaginationQueryDto) {
    return this.adminService.getAuditLog(query.page, query.limit);
  }
}
