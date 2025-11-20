#!/bin/bash

# Script to stop PostgreSQL Docker container
set -e

echo "🛑 Stopping PostgreSQL container..."
cd "$(dirname "$0")/../.." || exit 1

docker compose -f docker-compose.dev.yml stop postgres
echo "✅ PostgreSQL stopped"

