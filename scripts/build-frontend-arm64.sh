#!/usr/bin/env bash
# HERMES — cross-build station-independent ARM64 standalone artifacts.
#
# Produces one tarball per app plus a SHA256 file and a shared manifest that
# the hermes-installer `frontend` task consumes. The artifacts contain only the
# Next.js standalone output (apps/<app>/server.js, node_modules, static, public)
# and run on the station's system Node; no container runtime is shipped.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

VERSION=""
APPS="hermes-shell hermes-gps"
OUT_DIR="$REPO_ROOT/dist"
PLATFORM="linux/arm64"

GIT_COMMIT_HASH="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo dev)"
BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-}"
NEXT_PUBLIC_ENABLE_CHAT="${NEXT_PUBLIC_ENABLE_CHAT:-false}"
NEXT_PUBLIC_PMTILES_URL="${NEXT_PUBLIC_PMTILES_URL:-/brazil.pmtiles}"
NEXT_PUBLIC_APP_TIME_ZONE="${NEXT_PUBLIC_APP_TIME_ZONE:-UTC}"

usage() {
  cat <<'EOF'
Usage: scripts/build-frontend-arm64.sh [options]

Options:
  --version <version>   Artifact version (default: dev-<short-sha>)
  --apps "<list>"       Space-separated apps (default: "hermes-shell hermes-gps")
  --out <dir>           Output directory (default: <repo>/dist)
  -h, --help            Show this help

Build-time inputs (override via environment):
  NEXT_PUBLIC_BASE_PATH       default: empty
  NEXT_PUBLIC_ENABLE_CHAT     default: false
  NEXT_PUBLIC_PMTILES_URL     default: /brazil.pmtiles
  NEXT_PUBLIC_APP_TIME_ZONE   default: UTC
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2:?--version requires a value}"; shift 2 ;;
    --apps)    APPS="${2:?--apps requires a value}"; shift 2 ;;
    --out)     OUT_DIR="${2:?--out requires a value}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

if [ -z "$VERSION" ]; then
  VERSION="dev-${GIT_COMMIT_HASH}"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to cross-build artifacts" >&2
  exit 1
fi

BUILD_ROOT="$OUT_DIR/build"
rm -rf "$BUILD_ROOT"
mkdir -p "$OUT_DIR"

echo "==> Building ${APPS} for ${PLATFORM}"
echo "==> Version: ${VERSION} (commit ${GIT_COMMIT_HASH})"
echo "==> Output:  ${OUT_DIR}"

manifest_entries=""

for app in $APPS; do
  app_dir="$BUILD_ROOT/$app"
  mkdir -p "$app_dir"

  echo "==> Building ${app}"
  docker buildx build \
    --platform "$PLATFORM" \
    --target artifact \
    --output "type=local,dest=$app_dir" \
    --build-arg APP="$app" \
    --build-arg GIT_COMMIT_HASH="$GIT_COMMIT_HASH" \
    --build-arg NEXT_PUBLIC_BASE_PATH="$NEXT_PUBLIC_BASE_PATH" \
    --build-arg NEXT_PUBLIC_ENABLE_CHAT="$NEXT_PUBLIC_ENABLE_CHAT" \
    --build-arg NEXT_PUBLIC_PMTILES_URL="$NEXT_PUBLIC_PMTILES_URL" \
    --build-arg NEXT_PUBLIC_APP_TIME_ZONE="$NEXT_PUBLIC_APP_TIME_ZONE" \
    -f "$REPO_ROOT/Dockerfile" \
    "$REPO_ROOT"

  if [ ! -f "$app_dir/apps/$app/server.js" ]; then
    echo "Artifact for ${app} is missing apps/${app}/server.js" >&2
    exit 1
  fi
  if [ ! -d "$app_dir/node_modules" ]; then
    echo "Artifact for ${app} is missing node_modules/" >&2
    exit 1
  fi

  tarball="${app}-${VERSION}-arm64.tar.gz"
  echo "==> Packaging ${tarball}"
  tar -C "$app_dir" -czf "$OUT_DIR/$tarball" .

  ( cd "$OUT_DIR" && sha256sum "$tarball" > "$tarball.sha256" )
  sha="$(cut -d' ' -f1 "$OUT_DIR/$tarball.sha256")"

  [ -n "$manifest_entries" ] && manifest_entries="$manifest_entries,"
  manifest_entries="$manifest_entries
    { \"app\": \"$app\", \"file\": \"$tarball\", \"sha256\": \"$sha\" }"
done

manifest="$OUT_DIR/manifest-$VERSION.json"
cat > "$manifest" <<EOF
{
  "version": "$VERSION",
  "gitCommit": "$GIT_COMMIT_HASH",
  "buildTime": "$BUILD_TIME",
  "platform": "$PLATFORM",
  "apps": [$manifest_entries
  ]
}
EOF

rm -rf "$BUILD_ROOT"

echo "==> Artifacts:"
ls -lh "$OUT_DIR"/*.tar.gz "$OUT_DIR"/*.sha256 "$manifest"
