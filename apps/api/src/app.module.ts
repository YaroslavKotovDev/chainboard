import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import configuration, { validate } from './config/configuration';
import { HealthModule } from './health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { UsersModule } from './modules/users/users.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Config — loaded first, globally available
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),

    // Database — globally available via PrismaModule
    PrismaModule,

    // Queue — Redis-backed BullMQ
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
      }),
      inject: [ConfigService],
    }),

    // Health check
    HealthModule,

    // Domain modules
    AuthModule,
    UsersModule,
    WalletModule,
    RewardsModule,
    AnalyticsModule,
    AdminModule,
  ],
})
export class AppModule {}
