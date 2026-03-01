#!/bin/sh
set -e

echo "[startup] Running database migrations..."
npx drizzle-kit migrate 2>&1 || echo "[startup] Warning: migration failed, continuing..."

echo "[startup] Starting server..."
exec node dist/index.js
