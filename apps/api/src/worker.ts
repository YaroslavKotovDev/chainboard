import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { BlockchainSyncService } from './modules/blockchain-sync/blockchain-sync.service';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const blockchainSyncService = app.get(BlockchainSyncService);
  await blockchainSyncService.start();

  const shutdown = async () => {
    await blockchainSyncService.stop();
    await app.close();
  };

  process.on('SIGINT', () => {
    void shutdown();
  });

  process.on('SIGTERM', () => {
    void shutdown();
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
