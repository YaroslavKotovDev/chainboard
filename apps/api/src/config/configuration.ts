import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SIWE_DOMAIN: z.string().min(1),
  SIWE_NONCE_EXPIRY_SECONDS: z.coerce.number().int().positive().default(300),
  RPC_URL_BASE_SEPOLIA: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive().default(84532),
  CLAIM_MANAGER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  REWARD_VAULT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  ACCESS_REGISTRY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  REWARD_TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  OPERATOR_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  DEPLOYER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  BLOCKCHAIN_SYNC_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  BLOCKCHAIN_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(500),
  BLOCKCHAIN_SYNC_FINALITY_BLOCKS: z.coerce.number().int().nonnegative().default(2),
  BLOCKCHAIN_SYNC_START_BLOCK: z.coerce.number().int().nonnegative().default(0),
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validate(config: Record<string, unknown>): AppConfig {
  const result = configSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration validation failed:\n${issues}`);
  }
  return result.data;
}

export default (): AppConfig => validate(process.env as Record<string, unknown>);
