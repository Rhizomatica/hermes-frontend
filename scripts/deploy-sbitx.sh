#!/usr/bin/env bash
# HERMES — sBitx deployment script (Task 1.2.11)
set -euo pipefail

APP="${1:-}"
SBITX_HOST="${2:-hermes.local}"

if [ -z "$APP" ]; then
  echo "Usage: $0 <app-name> [sbitx-host]"
  exit 1
fi

echo "==> Building $APP..."
./scripts/build-arm64.sh "$APP"

echo "==> Extracting standalone output..."
CONTAINER_ID=$(docker create "hermes-$APP:latest")
docker cp "$CONTAINER_ID:/app/apps/$APP/.next/standalone" "./deploy/$APP"
docker cp "$CONTAINER_ID:/app/apps/$APP/.next/static" "./deploy/$APP/.next/static"
docker cp "$CONTAINER_ID:/app/apps/$APP/public" "./deploy/$APP/public"
docker rm "$CONTAINER_ID"

echo "==> Packaging..."
cd deploy && tar -czf "$APP.tar.gz" "$APP" && cd ..

echo "==> Deploying to $SBITX_HOST..."
scp "deploy/$APP.tar.gz" "root@$SBITX_HOST:/opt/hermes/"
ssh "root@$SBITX_HOST" "cd /opt/hermes && tar -xzf $APP.tar.gz && rm $APP.tar.gz && systemctl restart hermes-$APP"

echo "==> Deploy complete."