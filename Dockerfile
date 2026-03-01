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

# Vite embeds VITE_* env vars at build time.
# Railway passes these as Docker build args automatically.
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_APP_TITLE
ARG VITE_APP_LOGO
ARG VITE_ANALYTICS_ENDPOINT
ARG VITE_ANALYTICS_WEBSITE_ID
ARG RAZORPAY_KEY_ID

ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_LOGO=$VITE_APP_LOGO
ENV VITE_ANALYTICS_ENDPOINT=$VITE_ANALYTICS_ENDPOINT
ENV VITE_ANALYTICS_WEBSITE_ID=$VITE_ANALYTICS_WEBSITE_ID
ENV RAZORPAY_KEY_ID=$RAZORPAY_KEY_ID

# Build the application (VITE_* vars are now available for Vite to embed)
RUN pnpm build

# Migration SQL files are already committed in drizzle/ folder
# drizzle-kit migrate runs at runtime via start.sh (needs DATABASE_URL)

# ---- Production Stage ----
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

# Install ffmpeg for video composition (image + audio → video)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

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
