#!/usr/bin/env bash
# HERMES — install a frontend release without touching HERMES-GUI.
#
# Implements the deployment contract used by both this manual script and the
# hermes-installer `frontend` task:
#
#   /opt/hermes-frontend/releases/<version>/<app>/   standalone layout
#   /opt/hermes-frontend/current -> releases/<version>
#   /opt/hermes-frontend/previous -> releases/<old-version>
#   /etc/hermes-frontend/<app>.env                   runtime variables only
#
# Artifacts come from HERMES_FRONTEND_RELEASE_URL (default) or a local
# HERMES_FRONTEND_ARTIFACTS directory for air-gapped stations. Every tarball is
# SHA256-verified before anything is installed or `current` is switched.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ROOT="${HERMES_FRONTEND_ROOT:-/opt/hermes-frontend}"
ETC="${HERMES_FRONTEND_ETC:-/etc/hermes-frontend}"
ROOT="${ROOT%/}"
ETC="${ETC%/}"
RUN_USER="${HERMES_FRONTEND_USER:-hermes}"
RUN_GROUP="${HERMES_FRONTEND_GROUP:-hermes}"
GUI_ROOT="/var/www/html"

VERSION=""
APPS="${HERMES_FRONTEND_APPS:-shell gps}"
ARTIFACTS="${HERMES_FRONTEND_ARTIFACTS:-}"
RELEASE_URL="${HERMES_FRONTEND_RELEASE_URL:-}"
STATION="${HERMES_FRONTEND_STATION:-}"
SYSTEMD_DIR="${HERMES_FRONTEND_SYSTEMD_DIR:-/etc/systemd/system}"
UNIT_DIR="${HERMES_FRONTEND_UNIT_DIR:-$SCRIPT_DIR/../deploy/systemd}"
ENABLE="${HERMES_FRONTEND_ENABLE:-false}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: scripts/deploy-frontend.sh --version <version> [options]

Options:
  --version <v>        Release version (matches the artifact names)
  --apps "<list>"      Apps to install: shell gps chat (default: $HERMES_FRONTEND_APPS or "shell gps")
  --artifacts <dir>    Local artifact directory (air-gapped fallback)
  --release-url <url>  Base URL holding the release assets
  --station <fqdn>     Station certificate name (default: hostname -f)
  --enable             Enable and start the units after installing (default: off)
  --dry-run            Verify and stage, print the plan, change nothing
  -h, --help           Show this help

Environment:
  HERMES_FRONTEND_ROOT              default /opt/hermes-frontend
  HERMES_FRONTEND_ETC               default /etc/hermes-frontend
  HERMES_FRONTEND_SYSTEMD_DIR       default /etc/systemd/system
  HERMES_FRONTEND_UNIT_DIR          default <repo>/deploy/systemd
  HERMES_FRONTEND_USER/GROUP        default hermes/hermes
  HERMES_FRONTEND_RELEASE_URL       primary artifact source
  HERMES_FRONTEND_ARTIFACTS         local fallback for air-gapped stations
  HERMES_FRONTEND_APPS              default "shell gps"
  HERMES_FRONTEND_STATION           daemon TLS server name
  HERMES_FRONTEND_ENABLE            true to enable/start the units
EOF
}

die() { echo "ERROR: $*" >&2; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    --version) VERSION="${2:?--version requires a value}"; shift 2 ;;
    --apps) APPS="${2:?--apps requires a value}"; shift 2 ;;
    --artifacts) ARTIFACTS="${2:?--artifacts requires a value}"; shift 2 ;;
    --release-url) RELEASE_URL="${2:?--release-url requires a value}"; shift 2 ;;
    --station) STATION="${2:?--station requires a value}"; shift 2 ;;
    --enable) ENABLE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

[ -n "$VERSION" ] || { usage >&2; die "--version is required"; }
[[ "$VERSION" =~ ^[A-Za-z0-9._-]+$ ]] || die "invalid version: $VERSION"
RELEASE_URL="${RELEASE_URL%/}"

case "$ROOT" in
  /*) ;;
  *) die "HERMES_FRONTEND_ROOT must be an absolute path" ;;
esac
[ "$ROOT" != "/" ] || die "refusing to use / as the release root"
case "$ROOT/" in
  "$GUI_ROOT"/*) die "refusing to install under $GUI_ROOT" ;;
esac
case "$GUI_ROOT/" in
  "$ROOT"/*) die "refusing to install a root that contains $GUI_ROOT" ;;
esac

if [ -z "$STATION" ]; then
  STATION="$(hostname -f 2>/dev/null || true)"
fi
[ -n "$STATION" ] || die "station name unavailable; pass --station or set HERMES_FRONTEND_STATION"

DEFAULT_ROOT="/opt/hermes-frontend"
DEFAULT_ETC="/etc/hermes-frontend"
DEFAULT_SYSTEMD="/etc/systemd/system"
if [ "$DRY_RUN" = false ] && [ "$(id -u)" -ne 0 ] \
  && { [ "$ROOT" = "$DEFAULT_ROOT" ] || [ "$ETC" = "$DEFAULT_ETC" ] \
       || [ "$SYSTEMD_DIR" = "$DEFAULT_SYSTEMD" ]; }; then
  die "must run as root (try sudo), or use --dry-run"
fi

app_pkg() {
  case "$1" in
    shell) echo "hermes-shell" ;;
    gps) echo "hermes-gps" ;;
    chat) echo "hermes-chat-final" ;;
    *) return 1 ;;
  esac
}

app_port() {
  case "$1" in
    shell) echo 4100 ;;
    gps) echo 4101 ;;
    chat) echo 4102 ;;
  esac
}

for app in $APPS; do
  app_pkg "$app" >/dev/null || die "unknown app: $app"
  [ -f "$UNIT_DIR/hermes-frontend-$app.service" ] \
    || die "missing unit file: $UNIT_DIR/hermes-frontend-$app.service"
done

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/hermes-deploy.XXXXXX")"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

if [ -n "$ARTIFACTS" ]; then
  SRC="$ARTIFACTS"
  [ -d "$SRC" ] || die "artifact directory not found: $SRC"
  SOURCE_KIND="local"
elif [ -n "$RELEASE_URL" ]; then
  SRC="$TMP_DIR/assets"
  mkdir -p "$SRC"
  SOURCE_KIND="remote"
else
  die "set HERMES_FRONTEND_RELEASE_URL or HERMES_FRONTEND_ARTIFACTS (or --release-url/--artifacts)"
fi

echo "==> Version:  $VERSION"
echo "==> Apps:     $APPS"
echo "==> Source:   $SOURCE_KIND ($([ "$SOURCE_KIND" = remote ] && echo "$RELEASE_URL" || echo "$SRC"))"
echo "==> Root:     $ROOT"
echo "==> Env:      $ETC"
echo "==> Station:  $STATION"
[ "$DRY_RUN" = true ] && echo "==> Mode:     dry run"

# ── 1. Fetch and verify every artifact before touching the install ───────────
for app in $APPS; do
  pkg="$(app_pkg "$app")"
  tarball="$pkg-$VERSION-arm64.tar.gz"
  sha_file="$tarball.sha256"

  if [ "$SOURCE_KIND" = remote ]; then
    echo "==> Downloading $tarball"
    curl -fsSL --retry 3 -o "$SRC/$tarball" "$RELEASE_URL/$tarball" \
      || die "failed to download $RELEASE_URL/$tarball"
    curl -fsSL --retry 3 -o "$SRC/$sha_file" "$RELEASE_URL/$sha_file" \
      || die "failed to download $RELEASE_URL/$sha_file"
  fi

  [ -f "$SRC/$tarball" ] || die "missing artifact: $SRC/$tarball"
  [ -f "$SRC/$sha_file" ] || die "missing checksum: $SRC/$sha_file"

  echo "==> Verifying SHA256 for $tarball"
  ( cd "$SRC" && sha256sum --check --status "$sha_file" ) \
    || die "checksum mismatch for $tarball; aborting before any change"
done

# ── 2. Extract into staging and validate the standalone layout ──────────────
STAGE="$TMP_DIR/stage"
ENV_STAGE="$STAGE/env"
mkdir -p "$STAGE" "$ENV_STAGE"

for app in $APPS; do
  pkg="$(app_pkg "$app")"
  port="$(app_port "$app")"
  tarball="$pkg-$VERSION-arm64.tar.gz"

  echo "==> Extracting $tarball"
  mkdir -p "$STAGE/$app"
  tar -xzf "$SRC/$tarball" -C "$STAGE/$app"

  [ -f "$STAGE/$app/apps/$pkg/server.js" ] \
    || die "$tarball is missing apps/$pkg/server.js"
  [ -d "$STAGE/$app/node_modules" ] \
    || die "$tarball is missing node_modules/"

  cat > "$ENV_STAGE/$app.env" <<EOF
# Managed by deploy-frontend.sh. Runtime variables only.
HERMES_API_URL=https://127.0.0.1:8080
HERMES_API_TLS_SERVERNAME=$STATION
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=$port
NODE_OPTIONS=--max-old-space-size=256
EOF
done

# ── 3. Install the release and runtime env, then switch `current` ───────────
RELEASE_DIR="$ROOT/releases/$VERSION"

if [ "$DRY_RUN" = true ]; then
  echo "==> Would install:"
  for app in $APPS; do
    echo "    $RELEASE_DIR/$app"
    echo "    $ETC/$app.env"
    echo "    $SYSTEMD_DIR/hermes-frontend-$app.service"
  done
  echo "    $ROOT/current -> $RELEASE_DIR"
  [ -L "$ROOT/current" ] && echo "    $ROOT/previous -> $(readlink -f "$ROOT/current")"
  echo "==> Dry run complete; nothing changed."
  exit 0
fi

echo "==> Installing release $VERSION"
install -d -m 0755 "$ROOT/releases" "$ROOT/releases/$VERSION" "$ETC"
RELEASE_DIR="$(readlink -f "$ROOT/releases/$VERSION")"

for app in $APPS; do
  dest="$RELEASE_DIR/$app"
  rm -rf "$dest"
  mv "$STAGE/$app" "$dest"
  install -m 0640 "$ENV_STAGE/$app.env" "$ETC/$app.env"
done

for app in $APPS; do
  unit="hermes-frontend-$app.service"
  install -d -m 0755 "$SYSTEMD_DIR"
  install -m 0644 "$UNIT_DIR/$unit" "$SYSTEMD_DIR/$unit"
  echo "==> Installed $SYSTEMD_DIR/$unit"
done

if [ "$(id -u)" -eq 0 ] && id -u "$RUN_USER" >/dev/null 2>&1; then
  group="$RUN_GROUP"
  id -g "$group" >/dev/null 2>&1 || group="$(id -gn "$RUN_USER")"
  chown -R "$RUN_USER:$group" "$RELEASE_DIR"
elif [ "$(id -u)" -eq 0 ]; then
  echo "==> WARNING: user $RUN_USER does not exist; release left root-owned"
fi

old_target=""
if [ -L "$ROOT/current" ]; then
  old_target="$(readlink -f "$ROOT/current" || true)"
fi

if [ -n "$old_target" ] && [ "$old_target" != "$RELEASE_DIR" ] && [ -d "$old_target" ]; then
  ln -sfn "$old_target" "$ROOT/.previous.tmp"
  mv -Tf "$ROOT/.previous.tmp" "$ROOT/previous"
  echo "==> previous -> $old_target"
fi

ln -sfn "$RELEASE_DIR" "$ROOT/.current.tmp"
mv -Tf "$ROOT/.current.tmp" "$ROOT/current"

echo "==> current -> $RELEASE_DIR"

if [ "$(id -u)" -eq 0 ] && command -v systemctl >/dev/null 2>&1 && [ -d /run/systemd/system ]; then
  systemctl daemon-reload
  if [ "$ENABLE" = true ]; then
    units=()
    for app in $APPS; do units+=("hermes-frontend-$app.service"); done
    systemctl enable --now "${units[@]}"
    echo "==> Enabled and started: ${units[*]}"
  else
    echo "==> Units installed but not enabled (set HERMES_FRONTEND_ENABLE=true to start)"
  fi
else
  echo "==> systemd not available here; skipped daemon-reload"
fi

echo "==> Installed $APPS at version $VERSION."
echo "==> HERMES-GUI under $GUI_ROOT was not touched."
