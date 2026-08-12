#!/usr/bin/env bash
# Download a Brazil PMTiles extract for offline use with SHA256 integrity check.
#
# Usage:
#   bash scripts/download-tiles.sh           # downloads; skips if file+cache+checksum match
#   bash scripts/download-tiles.sh --force   # re-download even if file exists
#
# Requires: curl, sha256sum
# The go-pmtiles CLI is downloaded automatically if not found on PATH.
#
# Integrates with npm postinstall hook to ensure tiles are available at build time.

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
CHECKSUM_FILE="${DEST}.sha256"

# ── Skip if file exists, checksum matches ────────────────────────────────────
if [[ -f "$DEST" ]] && [[ "$FORCE" == false ]]; then
  if [[ -f "$CHECKSUM_FILE" ]]; then
    echo "Checking SHA256 integrity..."
    if sha256sum --check "$CHECKSUM_FILE" --status 2>/dev/null; then
      echo "Tile file already present and checksum verified: $DEST"
      exit 0
    else
      echo "Checksum mismatch — re-downloading..."
    fi
  else
    echo "Tile file already present: $DEST"
    echo "No checksum file found — use --force to re-download."
    exit 0
  fi
fi

# ── Find the latest Protomaps planet build ───────────────────────────────────
# Brazil bounding box: minLon, minLat, maxLon, maxLat
BBOX="-74.0,-33.8,-28.6,5.3"
# Cap zoom to 13 — streets are clearly visible; zoom 14-15 adds size without value
MAXZOOM=13

SOURCE=""
MAX_DAYS_BACK=7
for ((i=0; i<MAX_DAYS_BACK; i++)); do
  CANDIDATE="https://build.protomaps.com/$(date -d "-${i} days" +%Y%m%d).pmtiles"
  echo "Trying source: $CANDIDATE ..."
  if curl -sSfI "$CANDIDATE" -o /dev/null 2>/dev/null; then
    SOURCE="$CANDIDATE"
    break
  fi
done

if [[ -z "$SOURCE" ]]; then
  echo "Could not find a recent Protomaps planet build."
  echo "Check https://maps.protomaps.com/builds/"
  exit 1
fi

echo "Source found: $SOURCE"

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
    curl -# -fL "$RELEASE_URL" -o "$TMP_DIR/pmtiles.zip" 2>&1
    unzip -q "$TMP_DIR/pmtiles.zip" -d "$TMP_DIR"
  else
    curl -# -fL "$RELEASE_URL" 2>&1 | tar -xz -C "$TMP_DIR"
  fi
  PMTILES_BIN="$TMP_DIR/pmtiles"
  chmod +x "$PMTILES_BIN"
fi

# ── Extract Brazil tiles with progress ───────────────────────────────────────
mkdir -p "$(dirname "$DEST")"
echo "Extracting tiles..."
echo "  Source:   $SOURCE"
echo "  BBox:     $BBOX  (Brazil)"
echo "  MaxZoom:  $MAXZOOM"
echo "  Dest:     $DEST"
echo ""

"$PMTILES_BIN" extract "$SOURCE" "$DEST" --bbox="$BBOX" --maxzoom="$MAXZOOM"

# ── Generate SHA256 checksum ─────────────────────────────────────────────────
if [[ -f "$DEST" ]]; then
  echo ""
  echo "Generating SHA256 checksum..."
  sha256sum "$DEST" | awk '{print $1}' > "$CHECKSUM_FILE"
  echo "Checksum saved to: $CHECKSUM_FILE"

  SIZE="$(du -sh "$DEST" | cut -f1)"
  echo "Done. File size: $SIZE"
else
  echo "Error: Tile extraction did not produce output file."
  exit 1
fi