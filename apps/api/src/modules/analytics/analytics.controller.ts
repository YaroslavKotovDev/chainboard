import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AnalyticsSummary, AnalyticsSnapshot, ActivityItem } from '@chainboard/types';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsSnapshotsQueryDto } from './dto/analytics.dto';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get top-level analytics summary metrics' })
  getSummary(): Promise<AnalyticsSummary> {
    return this.analyticsService.getSummary();
  }

  @Get('snapshots')
  @ApiOperation({ summary: 'Get time-series snapshots by scope and metric' })
  @ApiQuery({ name: 'scope', enum: ['DAILY', 'WEEKLY', 'MONTHLY'] })
  @ApiQuery({ name: 'metric', example: 'claims_count' })
  @ApiQuery({ name: 'from', example: '2025-01-01T00:00:00Z' })
  @ApiQuery({ name: 'to', example: '2025-03-31T23:59:59Z' })
  getSnapshots(@Query() query: AnalyticsSnapshotsQueryDto): Promise<AnalyticsSnapshot[]> {
    return this.analyticsService.getSnapshots(query.scope, query.metric, query.from, query.to);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent on-chain and claim activity feed' })
  getActivity(): Promise<ActivityItem[]> {
    return this.analyticsService.getRecentActivity();
  }
}
