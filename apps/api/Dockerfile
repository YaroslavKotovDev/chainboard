# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json       ./packages/types/
COPY packages/utils/package.json       ./packages/utils/
COPY packages/config/package.json      ./packages/config/
COPY apps/api/package.json             ./apps/api/

# Install all dependencies (including dev — needed for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/types/    ./packages/types/
COPY packages/utils/    ./packages/utils/
COPY packages/config/   ./packages/config/
COPY apps/api/          ./apps/api/

# Generate Prisma client
RUN pnpm --filter @chainboard/api exec prisma generate

# Build the API
RUN pnpm --filter @chainboard/api build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Install only production runtime
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copy workspace manifests for prod install
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/types/package.json       ./packages/types/
COPY packages/utils/package.json       ./packages/utils/
COPY packages/config/package.json      ./packages/config/
COPY apps/api/package.json             ./apps/api/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output + prisma
COPY --from=builder /app/apps/api/dist       ./apps/api/dist
COPY --from=builder /app/apps/api/prisma     ./apps/api/prisma
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:4000/v1/health || exit 1

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/apps/api/src/main.js"]
