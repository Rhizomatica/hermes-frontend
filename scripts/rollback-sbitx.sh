#!/usr/bin/env bash
# HERMES — sBitx rollback script (Task 1.2.11)
set -euo pipefail

APP="${1:-}"
SBITX_HOST="${2:-hermes.local}"

if [ -z "$APP" ]; then
  echo "Usage: $0 <app-name> [sbitx-host]"
  exit 1
fi

ssh "root@$SBITX_HOST" "cd /opt/hermes && [ -d \"$APP.prev\" ] && mv \"$APP\" \"$APP.failed\" 2>/dev/null; mv \"$APP.prev\" \"$APP\" && systemctl restart hermes-$APP && echo 'Rollback complete.' || echo 'ERROR: No previous version found.'"