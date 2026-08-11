#!/usr/bin/env bash
# HERMES — ARM64 cross-compilation build script (Task 1.2.11)
# Builds standalone output for sBitx Raspberry Pi (ARM64)
set -euo pipefail

APP="${1:-}"
if [ -z "$APP" ]; then
  echo "Usage: $0 <app-name>  (hermes-shell | hermes-gps-final | hermes-chat-final)"
  exit 1
fi

export GIT_COMMIT_HASH="$(git rev-parse --short HEAD)"
export NEXT_PUBLIC_APP_VERSION="${GIT_COMMIT_HASH:-dev}"
export NEXT_PUBLIC_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "==> Building $APP for linux/arm64"
echo "==> Version: $NEXT_PUBLIC_APP_VERSION"

docker buildx build \
  --platform linux/arm64 \
  --build-arg APP="$APP" \
  --build-arg GIT_COMMIT_HASH="$GIT_COMMIT_HASH" \
  -t "hermes-$APP:latest" \
  --load \
  -f Dockerfile \
  .

echo "==> Build complete: hermes-$APP:latest"