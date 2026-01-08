# AeroDine Backend Dockerfile
# Multi-stage build for production

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy source code
COPY . .

# Build shared-types first
WORKDIR /app/packages/shared-types
RUN pnpm build

# Build backend
WORKDIR /app/backend
RUN pnpm prisma generate
RUN pnpm build

# ============================================================================
# Stage 3: Production
# ============================================================================
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/packages/shared-types/dist ../packages/shared-types/dist
COPY --from=builder /app/packages/shared-types/package.json ../packages/shared-types/package.json

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start command
CMD ["node", "dist/main.js"]
