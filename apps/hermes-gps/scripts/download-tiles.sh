#!/usr/bin/env bash
# Download a South America PMTiles extract for offline use.
#
# Why South America bbox instead of the full planet?
#   - Full planet build:              ~8 GB
#   - South America extract (0–12):   ~300–500 MB
#   - Zoom levels 0–4 in ANY extract cover the ENTIRE world automatically,
#     so the map still shows a full world overview when zoomed out.
#
# Usage:
#   bash scripts/download-tiles.sh           # downloads; skips if file already exists
#   bash scripts/download-tiles.sh --force   # re-download even if file exists
#
# Requires: curl
# The go-pmtiles CLI is downloaded automatically if not found on PATH.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --force|-f) FORCE=true ;;
  esac
done

DEST="${SCRIPT_DIR}/../public/brazil.pmtiles"
DEST="$(realpath -m "$DEST")"

# ── Skip if already exists ──────────────────────────────────────────────────
if [[ -f "$DEST" ]] && [[ "$FORCE" == false ]]; then
  echo "Tile file already present: $DEST"
  echo "Use --force to re-download."
  exit 0
fi

# ── Find the latest Protomaps planet build ───────────────────────────────────
# Brazil bounding box: minLon, minLat, maxLon, maxLat
BBOX="-74.0,-33.8,-28.6,5.3"
# Cap zoom to 13 — streets are clearly visible; zoom 14-15 adds size without value
MAXZOOM=13

SOURCE=""
for i in 0 1 2 3 4 5 6; do
  CANDIDATE="https://build.protomaps.com/$(date -d "-${i} days" +%Y%m%d).pmtiles"
  if curl -sSfI "$CANDIDATE" -o /dev/null 2>/dev/null; then
    SOURCE="$CANDIDATE"
    break
  fi
done

if [[ -z "$SOURCE" ]]; then
  echo "Could not find a recent Protomaps planet build. Check https://maps.protomaps.com/builds/"
  exit 1
fi

# ── Resolve the go-pmtiles CLI ───────────────────────────────────────────────
PMTILES_BIN="$(command -v pmtiles 2>/dev/null || true)"

if [[ -z "$PMTILES_BIN" ]]; then
  OS="$(uname -s)"
  ARCH="$(uname -m)"

  case "$OS" in
    Linux)  OS_TAG="Linux" ;;
    Darwin) OS_TAG="macOS" ;;
    *)      echo "Unsupported OS: $OS"; exit 1 ;;
  esac

  case "$ARCH" in
    x86_64)         ARCH_TAG="x86_64" ;;
    arm64|aarch64)  ARCH_TAG="arm64" ;;
    *)              echo "Unsupported arch: $ARCH"; exit 1 ;;
  esac

  RELEASE_URL="$(curl -sSf "https://api.github.com/repos/protomaps/go-pmtiles/releases/latest" \
    | grep -o '"browser_download_url": "[^"]*'"${OS_TAG}_${ARCH_TAG}"'[^"]*"' \
    | grep -o 'https://[^"]*')"

  if [[ -z "$RELEASE_URL" ]]; then
    echo "Could not find a go-pmtiles release for ${OS_TAG}/${ARCH_TAG}"
    exit 1
  fi

  TMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TMP_DIR"' EXIT

  echo "Downloading go-pmtiles CLI ..."
  if [[ "$RELEASE_URL" == *.zip ]]; then
    curl -sSfL "$RELEASE_URL" -o "$TMP_DIR/pmtiles.zip"
    unzip -q "$TMP_DIR/pmtiles.zip" -d "$TMP_DIR"
  else
    curl -sSfL "$RELEASE_URL" -o "$TMP_DIR/pmtiles.tar.gz"
    tar -xz -C "$TMP_DIR" -f "$TMP_DIR/pmtiles.tar.gz"
  fi
  PMTILES_BIN="$TMP_DIR/pmtiles"
  chmod +x "$PMTILES_BIN"
fi

# ── Extract South America tiles ──────────────────────────────────────────────
mkdir -p "$(dirname "$DEST")"
echo "Source: $SOURCE"
echo "BBox:   $BBOX  (Brazil)"
echo "MaxZoom: $MAXZOOM"
echo "Dest:   $DEST"
"$PMTILES_BIN" extract "$SOURCE" "$DEST" --bbox="$BBOX" --maxzoom="$MAXZOOM"

SIZE="$(du -sh "$DEST" | cut -f1)"
echo "Done. File size: $SIZE"
