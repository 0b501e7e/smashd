#!/bin/bash

# Script to start PostgreSQL (via Docker) and backend together
set -e

echo "🐘 Starting PostgreSQL with Docker Compose..."
cd "$(dirname "$0")/../.." || exit 1

# Start PostgreSQL if not already running
if ! docker ps | grep -q smashd-postgres-dev; then
  echo "📦 Starting PostgreSQL container..."
  docker compose -f docker-compose.dev.yml up -d postgres
  
  echo "⏳ Waiting for PostgreSQL to be ready..."
  timeout=30
  counter=0
  until docker exec smashd-postgres-dev pg_isready -U senan -d smashd > /dev/null 2>&1; do
    sleep 1
    counter=$((counter + 1))
    if [ $counter -ge $timeout ]; then
      echo "❌ PostgreSQL failed to start within $timeout seconds"
      exit 1
    fi
  done
  echo "✅ PostgreSQL is ready!"
else
  echo "✅ PostgreSQL container is already running"
fi

# Run migrations
echo "🔄 Running database migrations..."
cd backend
# Use the local database URL from .env.development
export DATABASE_URL="postgresql://senan:postgres@localhost:5432/smashd?schema=public"
npx prisma migrate deploy || true

# Start the backend
echo "🚀 Starting backend server..."
npm run dev

