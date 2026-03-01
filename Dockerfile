# ---- Build Stage ----
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Migration SQL files are already committed in drizzle/ folder
# drizzle-kit migrate runs at runtime via start.sh (needs DATABASE_URL)

# ---- Production Stage ----
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Install drizzle-kit separately for runtime migrations
# (it's a devDependency but needed at startup to run drizzle-kit migrate)
RUN pnpm add drizzle-kit tsx

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Copy drizzle migrations and config (needed for runtime migration)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Copy startup script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

ENV NODE_ENV=production

# Railway injects PORT dynamically — do NOT hardcode it
# The server reads process.env.PORT and falls back to 3000
EXPOSE 3000

# Run migrations then start the server
CMD ["./start.sh"]
