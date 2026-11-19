# Deploy — Radio Coexistence (Multi-Port) Task List

**Project**: hermes-frontend
**Type**: Deployment / migration
**Branch**: `feature/deploy-radio-coexist`
**Target**: the agreed bench station (details kept in the PR/tracker)
**Status**: D1 preflight complete; D2–D11 pending
**Created**: 2026-11-17
**Revised**: 2026-11-18 — runtime URL derivation, station name, system Node,
radiod health gate, and resource limits from the review

---

## Goal

Deploy the new Next.js frontend to the agreed bench station **without replacing
HERMES-GUI**. The existing Angular GUI stays the main interface at `/`. The new
frontend runs on its own HTTPS ports so both run together for a gradual migration.

The radio daemon (`hermes-radio-daemon`), PHP API, nginx, and the GUI are already
installed and running on the station. This work must not change the GUI's URL,
login, or radio behaviour.

## Decisions

| Decision | Value |
|---|---|
| Coexistence model | Separate HTTPS ports, permanently |
| GUI | `https://<station>/` — unchanged |
| Shell | `https://<station>:4000/` |
| GPS | `https://<station>:4001/` |
| Chat | `https://<station>:4002/` (later) |
| Public base path | Empty for every app |
| Station-specific builds | None — app URLs are derived at runtime from `location` |
| First deploy scope | `hermes-shell` + `hermes-gps` (confirmed — GPS hardware present) |
| Build location | Cross-build ARM64 standalone artifacts on the dev host/CI and ship tarballs |
| Artifact delivery | GitHub Release assets via `HERMES_FRONTEND_RELEASE_URL` plus SHA256; local `HERMES_FRONTEND_ARTIFACTS` fallback |
| Node runtime | System `/usr/bin/node` only; the installer requires the app's minimum version |
| Installer default | Install files, units, and nginx snippet; do not enable/start unless `HERMES_FRONTEND_ENABLE=true` |
| WebSocket | Proxied at `/ws` on each frontend port with upstream TLS verification |
| Production runtime | Native Node + systemd, no containers |
| Docker | Development, testing, and artifact building only — never production |
| Auth | Host-scoped `hermes_session` cookie shared across ports; GUI keeps its own PHP/localStorage login |

## Decision Gates

| Gate | Input | Default |
|---|---|---|
| Artifact delivery | Whether GitHub Releases are reachable from the station | Use a local `HERMES_FRONTEND_ARTIFACTS` directory |
| Maintenance window | The bench owners running Mercury tests | Do not install or start until a window is agreed |
| First deploy scope | Station GPS hardware | Shell + GPS (confirmed; `HAS_GPS=false` was wrong) |

Gates:
- **D2 is not blocked** by a build-URL decision; one station-independent release
  serves every station.
- **D8 is blocked** until artifact delivery and the maintenance window are
  confirmed.
- Every other decision can proceed.

## Why Ports

Separate ports are the intended architecture, not a temporary step:

- A service worker on `:443` cannot control `:4000`; the GUI's Angular service
  worker cannot intercept the new frontend.
- No `basePath` support or client `fetch('/api/...')` refactor is required.
- Theme, locale, and session cookies are host-scoped and already shared across
  ports (`ThemeProvider`, `LocaleProvider`, `hermes_session`).
- The apps all live on the same host and differ only by port, so the browser can
  derive their URLs from the page it was loaded from.
- The GUI's PHP `/api` and the new frontend's Next `/api` routes stay in separate
  origins, so they can coexist indefinitely without a namespace collision.
- A future cutover is still possible: move the winning UI to `:443` and the GUI
  to a legacy port. No path migration is involved.

The shell is the intended single entry point for the new frontend; its app
selector links to `:4001` and `:4002`. During the first deploy the kiosk stays on
the GUI; it can be pointed at `:4000` later for the trial.

## Current State and Gaps

Verified against the repositories and the read-only station review:

- HERMES-GUI is an Angular static build in `/var/www/html`, served by nginx on 443
  with `location /` as the catch-all. Its API is the PHP API at `/api`; its radio
  socket is `wss://<station>:8080/websocket`.
- HERMES-GUI registers `ngsw-worker.js` in production with the default scope `/`.
  Because the new frontend is on a different port, this is harmless.
- `hermes-frontend` has three Next.js apps with `output: 'standalone'`. They talk
  to `hermes-radio-daemon` `/api/v2` and use their own `/api/auth/*` routes.
- The real standalone layout is `apps/<app>/server.js` plus a sibling
  `node_modules/`; it is **not** a flat `server.js` at the release root.
- The client currently builds cross-app URLs from `NEXT_PUBLIC_*_URL` at compile
  time. That bakes one station per build; the review asks for runtime derivation
  from `location` instead.
- `hermes-installer/tasks/frontend_setup.sh` exists but is **not wired into
  `installer.sh`**. It also has stale values: `hermes-gps-final`,
  `NEXT_PUBLIC_RADIO_DAEMON_WS_URL` (code reads `NEXT_PUBLIC_WS_URL`), and
  `HERMES_API_URL=https://<host>/api` (should be the daemon on `:8080`).
- `scripts/deploy-sbitx.sh`, `scripts/rollback-sbitx.sh`, and the release workflow
  assume `/opt/hermes/<app>` plus `hermes-<app>.service`. The installer creates
  neither, so there is no agreed deployment contract. The workflow's staging and
  production deploy jobs are still placeholders.
- The installer already clones other projects from GitHub, but an installed
  station may be air-gapped. Release downloads need a local-artifact fallback.
- `ServiceWorkerRegistrator` registers `/sw.js` whenever the base path is empty
  and the environment is production. Only `hermes-shell/public/sw.js` exists;
  GPS and chat would request a missing file.
- The shell always renders the Chat link. With chat not deployed, it will 404.
- `apps/hermes-gps/src/app/page.tsx` uses
  `href={{ pathname: NEXT_PUBLIC_SHELL_URL }}` and a default of
  `'localhost:4000'`; this needs a plain absolute URL.

Review facts (read-only):

- Station Node is `20.19.2`.
- `/api/v2/health` answers `200`.
- The certificate covers `*.hermes.radio` and `hermes.radio` only.
- The Pi has 1.8 GB of RAM and 3 usable cores; core 3 is isolated for radiod's
  DSP.
- radiod listens on `0.0.0.0:8080` with its own TLS; nginx is not involved.
- `/api/v2` exists only when radiod is built with its Go API (Go 1.27). A radiod
  without it answers 404 on `/api/v2/health`.

## Target Architecture

```
nginx 443             -> /var/www/html                 HERMES-GUI (unchanged)
radiod 8080 (direct)  -> hermes-radio-daemon           REST /api/v2 + WebSocket
nginx 4000 (TLS)      -> 127.0.0.1:4100                hermes-shell
nginx 4001 (TLS)      -> 127.0.0.1:4101                hermes-gps
nginx 4002 (TLS)      -> 127.0.0.1:4102                hermes-chat-final (later)

Each new server block also proxies:
  /ws                 -> https://127.0.0.1:8080/api/v2/ws
  4001 only: /brazil.pmtiles -> /opt/hermes-frontend/tiles/brazil.pmtiles

Browser:
  https://<station>.hermes.radio:4000    shell, wss://<host>/ws
  https://<station>.hermes.radio:4001    gps,   wss://<host>/ws
```

Systemd binds the Next servers to `127.0.0.1`; only nginx exposes them.

The browser uses the station name so the certificate matches. With the IP, the
browser shows a warning, the service worker does not register, and the kiosk has
no way to accept the warning. The build no longer depends on this choice because
the app URLs are derived at runtime.

## Deployment Contract

### Ports

| Public | Internal | App | Notes |
|---|---|---|---|
| 443 | — | HERMES-GUI | unchanged |
| 8080 | — | radiod | direct, its own TLS |
| 4000 | 4100 | `hermes-shell` | entry point |
| 4001 | 4101 | `hermes-gps` | serves tiles |
| 4002 | 4102 | `hermes-chat-final` | later |

Preflight must confirm `4000-4002` are free and reachable through the station
firewall/VPN.

### Artifact layout

Each app keeps the standalone shape Next produces:

```
/opt/hermes-frontend/
  releases/<version>/shell/
    apps/hermes-shell/server.js
    apps/hermes-shell/.next/...
    apps/hermes-shell/public/...
    node_modules/
  releases/<version>/gps/
    apps/hermes-gps/server.js
    apps/hermes-gps/.next/...
    apps/hermes-gps/public/...
    node_modules/
  current -> releases/<version>
  previous -> releases/<version>
  tiles/brazil.pmtiles
```

`WorkingDirectory` is `current/<app>`; `ExecStart` is
`/usr/bin/node apps/<app>/server.js`. The sibling `node_modules` must be kept so
Node resolves the standalone dependencies.

### Runtime URL derivation

The client builds its sibling-app URLs from the page it was loaded from. No
station address is baked into the bundle.

| URL | Value |
|---|---|
| Shell | `${location.protocol}//${location.hostname}:4000` |
| GPS | `${location.protocol}//${location.hostname}:4001` |
| Chat | `${location.protocol}//${location.hostname}:4002` |
| Login | `${shell}/login` |
| WebSocket | `wss://${location.host}/ws` |
| PMTiles | `/brazil.pmtiles` (same origin as GPS) |

The helper must be SSR-safe: return relative paths on the server, or compute the
cross-app values after mount, so hydration does not mismatch.

### Environment matrix

Build-time (one artifact for every station):

| Variable | Shell | GPS |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | empty | empty |
| `NEXT_PUBLIC_ENABLE_CHAT` | `false` for first deploy | — |
| `NEXT_PUBLIC_PMTILES_URL` | — | `/brazil.pmtiles` |
| `NEXT_PUBLIC_APP_TIME_ZONE` | station timezone | station timezone |
| `GIT_COMMIT_HASH` | version stamp | version stamp |

Runtime (read by the Next server process):

| Variable | Value |
|---|---|
| `HERMES_API_URL` | `https://127.0.0.1:8080` |
| `HERMES_API_TLS_SERVERNAME` | `<station>.hermes.radio` |
| `NODE_EXTRA_CA_CERTS` | not needed while the station certificate is publicly trusted |
| `PORT` | `4100` / `4101` / `4102` |
| `HOSTNAME` | `127.0.0.1` |
| `NODE_ENV` | `production` |
| `NODE_OPTIONS` | `--max-old-space-size=256` (tune after measurement) |

### Cookies and sessions

- `hermes_session` stays host-scoped with `Path=/`; it is shared across all ports.
- Verify in preflight that the PHP API does not use a cookie named
  `hermes_session`. If it does, use a distinct name for the new frontend and
  translate it to `Authorization: Bearer` in the Next route handlers.
- Add `Secure` to the login cookie; the station is HTTPS-only.
- `hermes_user`, the theme cookie, and the locale cookie are host-scoped and
  already work across ports.

### Service workers

- The GUI's service worker on `:443` cannot control `:4000`, `:4001`, or `:4002`.
- Only the shell has `public/sw.js`. For the first deploy, disable service worker
  registration in GPS and chat (or add `sw.js` to each) so production does not
  request a missing file.
- The shell may keep its own service worker on `:4000`; it registers only when the
  origin uses the matching station certificate.

### systemd

One unit per app: `hermes-frontend-shell`, `hermes-frontend-gps`, and later
`hermes-frontend-chat`.

- Non-root user `hermes`.
- `WorkingDirectory=/opt/hermes-frontend/current/<app>`.
- `ExecStart=/usr/bin/node apps/<app>/server.js`.
- `EnvironmentFile=/etc/hermes-frontend/<app>.env`.
- `Restart=on-failure`, `After=network-online.target`.
- `NODE_OPTIONS=--max-old-space-size=256` from the start.
- `Nice=10` and `CPUWeight=50` so radiod and the modem keep priority.
- Optional `MemoryHigh`/`MemoryMax` once the real footprint is measured.
- No hard dependency on a specific radio controller unit name.

### nginx

One TLS `server` block per public port. Reuse the station certificate.

- `location /` proxies to the matching internal port. Do **not** rewrite the URI;
  the apps are built with an empty base path.
- `location = /ws` proxies to `https://127.0.0.1:8080/api/v2/ws` with HTTP/1.1
  upgrade headers.
- Upstream TLS: `proxy_ssl_server_name on`, `proxy_ssl_name
  <station>.hermes.radio`, `proxy_ssl_trusted_certificate
  /etc/ssl/certs/ca-certificates.crt`, `proxy_ssl_verify on`.
- On `:4001`, `location = /brazil.pmtiles` serves
  `/opt/hermes-frontend/tiles/brazil.pmtiles` with range support.
- Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Set `client_max_body_size 100M`.
- The new blocks own their headers; the GUI's CSP header does not apply here.

## Task List

### [x] D1: Station preflight audit

**Description**: Read-only checks on the agreed bench station before changing
anything. This task confirms the artifact-delivery gate and produces the inputs
for D6 and D8.

**Acceptance**:
- Debian version, free disk, and free RAM recorded.
- `node --version` recorded; the installer will require the app's minimum
  version. No private runtime is installed.
- `/api/v2/health` returns `200`; if it does not, stop — radiod lacks the Go API.
- radiod is confirmed to listen on `0.0.0.0:8080`.
- The certificate covers the station name; the browser/kiosk URL uses
  `https://<station>.hermes.radio`.
- `4000-4002` are free and allowed through the firewall/VPN.
- PHP API confirmed not to use a `hermes_session` cookie.
- GUI and radiod currently healthy; a config backup is taken.
- A test daemon user is available.
- A maintenance window is agreed with the bench owners; the test station is used
  for time-sensitive Mercury tests.
- The artifact-delivery gate is recorded.

**Preflight results** (2026-11-18, station name redacted):

| Check | Observed | Verdict |
|---|---|---|
| OS | Debian 13.7 (trixie), aarch64, kernel 6.18 | OK |
| CPU / RAM | 3 cores; 1843 MB total, ~1153 MB available | OK (tight) |
| Disk | 29 G total, 24 G used, **4.8 G free (84%)** | Risk — budget releases and tiles |
| Node | `v20.19.2` | OK, satisfies `^20.19.0` |
| radiod | `radiod.service` active; listens `0.0.0.0:8080` | OK |
| `/api/v2/health` | `200` via station name and public cert | OK |
| Certificate | `CN=*.hermes.radio`, SAN `*.hermes.radio, hermes.radio`, valid to 2027-02-19 | OK |
| Ports 4000–4002 / 4100–4102 | nothing listening | free |
| Firewall | `nft` present; `nft list ruleset` empty; no iptables/ufw | no packet filter; ports open |
| GUI | `https://<station>/` → `301` → `/es` → `200` | OK |
| Failed units | none | OK |
| PHP session | `session.name = PHPSESSID`; no Laravel `SESSION_COOKIE` | no `hermes_session` collision |
| Tiles | no `.pmtiles` on the station; `apps/hermes-gps/public/brazil.pmtiles` is **1.5 G** (gitignored) | must ship the tile; size is affordable inside 4.8 G but old releases must be pruned |
| GPS | `gpsd` active, `/dev/ttyACM0` present | GPS present; `HAS_GPS=false` is wrong |
| Backup | `/root/preflight-2026-11-18-1415.tgz`, 12K, sha256 `a9042d370231574e3f5df0e8c95d3ba4d98b87bfa996a81f5039fc0e428fc291` | OK (root-only; contains `secrets`, `voice.key`) |
| Artifact delivery | GitHub Releases reachable (`200`) | use release assets; local fallback not needed |
| Test daemon user | radiod store `/var/lib/hermes-radio-daemon/hermes.sqlite`; only `root` (operator) confirmed; `/api/v2/users` returns `401` | PASS — D9 uses `root` with owner consent |

**Gates after D1**:
- Artifact delivery: GitHub Releases reachable.
- Maintenance window: agreed with the bench owners; the actual dates are tracked
  outside the repository.
- First deploy scope: **shell + GPS**. GPS hardware is present, so this
  supersedes the earlier `HAS_GPS=false` assumption; `brazil.pmtiles` must be
  shipped and its size added to the disk budget before D8.

---

### [ ] D2: Cross-build station-independent ARM64 artifacts

**Status**: Implemented; pending a real ARM64 build (Docker is not available on
the development host used here). Layout and manifest verified with a mock
builder.

**Description**: Make the Docker build publish one shell tarball and one GPS
tarball that work on every station. Only app-behaviour variables and the version
stamp are build-time inputs.

**Files**:
- `Dockerfile` — `ARG`/`ENV` for `NEXT_PUBLIC_BASE_PATH`,
  `NEXT_PUBLIC_ENABLE_CHAT`, `NEXT_PUBLIC_PMTILES_URL`,
  `NEXT_PUBLIC_APP_TIME_ZONE`, and `GIT_COMMIT_HASH`
- `scripts/build-frontend-arm64.sh` — new script using the scratch `artifact`
  stage and `--output type=local`
- `.github/workflows/release.yml` — publish the tarballs, `.sha256` files, and
  manifest as release assets

**Acceptance**:
- Produces `hermes-shell-*.tar.gz` and `hermes-gps-*.tar.gz` plus `.sha256`.
- The manifest records the version and build time, not a station address.
- The GitHub Release contains every asset the installer expects.
- No `.env*` file is required in the build context.
- The tarball keeps the `apps/<app>/server.js` + `node_modules` layout.
- The same artifact is valid for every station.

---

### [x] D3: Deployment contract and release layout

**Status**: Implemented in `scripts/deploy-frontend.sh`; verified locally with
mock artifacts (install, upgrade, repeated install, checksum mismatch,
unreachable URL, dry run, and GUI-path guard).

**Description**: Define and implement the release directories, runtime env files,
ownership, and `current`/`previous` symlinks used by both the installer and the
manual deploy.

**Acceptance**:
- `/opt/hermes-frontend/releases/<version>/<app>` matches the standalone layout.
- `/opt/hermes-frontend/current` points to the installed release.
- `/etc/hermes-frontend/<app>.env` contains only runtime variables.
- A repeated install preserves `previous` and does not delete the GUI tree.
- `HERMES_FRONTEND_RELEASE_URL` is the primary artifact source; the installer
  downloads the assets and verifies their SHA256.
- `HERMES_FRONTEND_ARTIFACTS` is supported as a local fallback for air-gapped
  installations.
- An unreachable release URL or a checksum mismatch aborts before `current` is
  switched.

**Implementation** (`scripts/deploy-frontend.sh`):
- `HERMES_FRONTEND_RELEASE_URL` is tried first; `HERMES_FRONTEND_ARTIFACTS`
  overrides it for air-gapped installs.
- Every selected app is downloaded (if remote) and SHA256-verified in a staging
  directory before any file is replaced.
- Tarballs are extracted to `releases/<version>/<app>` and validated to contain
  `apps/<pkg>/server.js` and `node_modules/`.
- Runtime env files are written to `/etc/hermes-frontend/<app>.env` with the
  internal port (`4100`/`4101`/`4102`), `HERMES_API_URL=https://127.0.0.1:8080`,
  the station-derived `HERMES_API_TLS_SERVERNAME`, `NODE_ENV=production`,
  `HOSTNAME=127.0.0.1`, and `NODE_OPTIONS=--max-old-space-size=256`.
- `current` is switched atomically with a temporary symlink; the prior target
  becomes `previous` and is preserved on repeated installs.
- The script refuses paths under `/var/www/html`, so HERMES-GUI is never touched.
- Release files are chowned to `hermes:hermes` when that user exists.

---

### [x] D4: systemd units

**Status**: Unit files added under `deploy/systemd/` and installed by
`scripts/deploy-frontend.sh`; local install verified. Starting them and the
reboot check happen on the station in D8.

**Description**: Add and install `hermes-frontend-shell.service` and
`hermes-frontend-gps.service`; prepare the chat unit but keep it disabled.

**Acceptance**:
- Units run as `hermes`, bind to `127.0.0.1`, and restart on failure.
- `NODE_OPTIONS=--max-old-space-size=256`, `Nice=10`, and `CPUWeight=50` are set.
- `systemctl start hermes-frontend-shell hermes-frontend-gps` succeeds.
- Apps survive `daemon-reload` and a station reboot.
- Logs are available through `journalctl -u hermes-frontend-*`.

**Implementation**:
- `deploy/systemd/hermes-frontend-{shell,gps,chat}.service` use
  `User=hermes`, `WorkingDirectory=/opt/hermes-frontend/current/<app>`,
  `ExecStart=/usr/bin/node apps/<pkg>/server.js`, and
  `EnvironmentFile=/etc/hermes-frontend/<app>.env` (which sets
  `HOSTNAME=127.0.0.1`, `PORT`, and `NODE_OPTIONS`).
- `Restart=on-failure`, `RestartSec=5`, `Nice=10`, `CPUWeight=50`,
  `LimitNOFILE=65536`, and `WantedBy=multi-user.target`.
- The chat unit carries a `ConditionPathExists` guard so it stays inert until
  the chat release is installed.
- `scripts/deploy-frontend.sh` installs the unit files and runs
  `systemctl daemon-reload`, but does **not** enable or start them unless
  `HERMES_FRONTEND_ENABLE=true` (or `--enable`) is set.

---

### [x] D5: nginx multi-port coexistence

**Status**: Config templates added under `deploy/nginx/` and installed by
`scripts/deploy-frontend.sh`; rendered configs validated with a parser locally.
`nginx -t` against the live config and the port/WebSocket checks happen on the
station in D9.

**Description**: Add three TLS server blocks (chat can be added later) without
modifying the existing 443 block.

**Acceptance**:
- `https://<station>:4000` reaches the shell; `:4001` reaches GPS.
- `https://<station>/` still returns the GUI; `/api` still reaches PHP.
- Assets load from each app's own origin.
- `wss://<host>:4000/ws` and `wss://<host>:4001/ws` connect to radiod.
- The upstream proxy uses `proxy_ssl_name <station>.hermes.radio` and the system
  CA bundle.
- `https://<station>:4001/brazil.pmtiles` serves the tile file.
- `nginx -t` passes before reload.

**Implementation**:
- `deploy/nginx/hermes-frontend-{shell,gps,chat}.conf` are station-independent
  templates. `deploy-frontend.sh` substitutes `__STATION_NAME__`,
  `__CERT_PATH__`, `__KEY_PATH__`, and `__TILES_ROOT__` at install time and
  writes them to `/etc/nginx/conf.d/`.
- Each block listens only on its own port, so the existing `:443` server block
  is untouched. `location /` proxies to the app without rewriting the URI;
  `location = /ws` proxies to `https://127.0.0.1:8080/api/v2/ws` with upgrade
  headers and `proxy_ssl_verify on` against the system CA bundle.
- GPS also serves `location = /brazil.pmtiles` from `<root>/tiles`.
- The script runs `nginx -t` after installing configs and removes them on
  failure, before `current` is switched. It reloads nginx only when
  `HERMES_FRONTEND_ENABLE=true` (or `--enable`).

---

### [ ] D6: Wire a real `frontend` task into hermes-installer

**Description**: Replace the orphan `frontend_setup.sh` with an artifact-based
task. Add it to `installer.sh` imports, `TASKS`, descriptions, and `run_task`.

**Acceptance**:
- `./installer.sh --list-tasks` shows `frontend`.
- The task does not clone or build the monorepo on the station and does not
  require Docker.
- `HERMES_FRONTEND_APPS` selects `shell`, `gps`, `chat`, or a combination.
- `/api/v2/health` is checked and must return `200`; otherwise the task refuses
  to enable the apps.
- The system `node` version is checked against the apps' minimum; no private
  runtime is installed.
- `HERMES_FRONTEND_RELEASE_URL` is used by default; `HERMES_FRONTEND_ARTIFACTS`
  works as the local fallback. Both are checksum-verified.
- Runtime env derives the daemon TLS name from the station, not a hardcoded name.
- The task installs files, units, and the nginx snippet but does **not** enable
  or start the units. `HERMES_FRONTEND_ENABLE=true` opts into start.
- Re-running the task is idempotent and keeps `previous`.
- The task runs after `webserver` and `hermesnet`, before `db` and `firstboot`.

---

### [x] D7: Runtime URLs and first-deploy app adjustments

**Status**: Code complete; runtime validation on the station happens in D9.
The helpers live in `packages/shared-auth` (`appUrls.ts`, `useAppUrl.ts`)
because both apps already depend on it.

**Description**: Replace station-specific build-time URLs with runtime
derivation, and make the small changes required by the shell + GPS scope.

**Files**:
- `packages/utils` or `packages/api` — `appOrigin(port)` and `wsUrl()` helpers
- `apps/hermes-shell/src/app/page.tsx` — use the helper for GPS/chat links; hide
  Chat when not deployed
- `apps/hermes-gps/src/app/page.tsx` — use the helper for the shell link
- `packages/shared-auth/src/useAuthGuard.ts` — build the login URL from the helper
- `apps/hermes-shell/src/app/api/auth/login/route.ts` — add `Secure`
- `apps/hermes-gps/src/app/layout.tsx` and chat layout — disable service worker
  registration for now
- `packages/shared-auth/src/WebSocketProvider.tsx` — use `wsUrl()`

**Acceptance**:
- No `NEXT_PUBLIC_*_URL` station address remains in the client.
- Cross-app links work on the station name and on a local test host.
- SSR output does not mismatch on hydration.
- No Chat link is rendered for the first deploy.
- The session cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`.
- GPS and chat do not request a missing `/sw.js`.

---

### [ ] D8: First deploy on the bench station

**Description**: Execute the runbook during the agreed maintenance window, when
no Mercury test is running. The GUI must remain available throughout.

**Runbook**:
1. Confirm the window with the bench owners; record the current GUI state and
   take a station config backup.
2. Fetch the shell + GPS release assets and verify their checksums.
3. Confirm `/api/v2/health` returns `200`.
4. Install into `/opt/hermes-frontend/releases/<version>/` and switch `current`.
5. Install runtime env files and systemd units.
6. Add the new nginx server blocks; run `nginx -t` before reloading.
7. Start the two units manually for the test (the installer does not start them
   by default).
8. Run the validation checklist in D9.

**Acceptance**:
- GUI at `/` is unchanged before, during, and after the deploy.
- New frontend login and GPS work at `:4000` and `:4001`.
- No changes to the kiosk URL are made in this task.
- The deploy happens outside a Mercury test.

---

### [ ] D9: Validation checklist

**GUI regression**:
- [ ] `https://<station>/` loads the GUI.
- [ ] GUI login, radio status, messages, and station pages still work.
- [ ] `wss://<station>:8080/websocket` still connects.

**New frontend**:
- [ ] `https://<station>.hermes.radio:4000` has no certificate warning.
- [ ] The shell's service worker registers.
- [ ] The shell redirects to `/login` when unauthenticated.
- [ ] Login succeeds with a daemon user; session is shared with `:4001`.
- [ ] App selector links to `https://<station>.hermes.radio:4001`.
- [ ] `:4001` loads, tiles render, and GPS data updates.
- [ ] Logout clears the session and returns to `:4000/login`.
- [ ] A hard refresh on a deep route does not 404.
- [ ] `wss://<host>:4000/ws` connects and receives updates.
- [ ] Browser console has no mixed-content or CSP errors.
- [ ] The GUI's service worker does not affect `:4000`/`:4001`.

**System**:
- [ ] Both units start on reboot.
- [ ] Memory use stays within the 1.8 GB station budget.
- [ ] Next does not starve radiod or the modem under load.
- [ ] `journalctl` shows no TLS or proxy errors.
- [ ] Re-running the deploy is idempotent and `previous` is usable.

---

### [ ] D10: Rollback

**Description**: Document and script rollback without touching the GUI.

**Runbook**:
1. `systemctl disable --now hermes-frontend-shell hermes-frontend-gps`.
2. Remove or comment the `include` for the new nginx blocks; run `nginx -t` and
   reload. The 443 block is untouched.
3. Optionally repoint `current` to `previous` and restart the units.

**Acceptance**:
- Rollback restores the pre-deploy state with the GUI still serving `/`.
- The procedure is tested once on the station.

---

### [ ] D11: Documentation, legacy cleanup, and Docker policy

**Description**: Record the runtime decision and remove competing contracts.

**Files**:
- `docs/adr/ADR-008-sbitx-deployment.md` — Docker is build/test only; production
  is standalone artifacts + systemd on separate ports.
- `README.md` — replace the sBitx deploy section with the multi-port runbook.
- `.env.example` — build-time vs runtime variables; remove the stale
  `NEXT_PUBLIC_RADIO_DAEMON_WS_URL` and station-specific URLs.
- `scripts/deploy-sbitx.sh`, `scripts/rollback-sbitx.sh` — update to the new
  contract or remove.
- `.github/workflows/release.yml` — remove or rewrite the placeholder
  staging/production deploy jobs.
- `hermes-installer` README/docs — describe the new `frontend` task.

**Acceptance**:
- The repository contains no real station address or private certificate name.
- Test-station details live in the PR or task tracker, not in the repo.

**Commit**: `docs(repo): document multi-port radio coexistence and Docker policy`

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Bench station is running Mercury tests | Time-sensitive tests disrupted | Agree a maintenance window before installing or starting |
| radiod lacks the Go API | `/api/v2` returns 404 | D1 and the installer check `/api/v2/health` must be 200 |
| System Node is older than the apps require | Next servers will not start | Installer checks the version and refuses; let `apt` carry the runtime |
| Runtime URL derivation and SSR | Hydration mismatch or empty links | SSR-safe helper; test on the station name and a local host |
| Memory/CPU pressure from two Next servers | radiod or modem timing disturbed | `NODE_OPTIONS`, `Nice=10`, `CPUWeight=50`; measure after deploy |
| GitHub Releases unreachable from the station | Installer cannot fetch artifacts | Support `HERMES_FRONTEND_ARTIFACTS` as a local fallback; verify checksums |
| PHP API also uses `hermes_session` | Cookie collision across ports | Preflight; use a distinct cookie name and translate to `Authorization` |
| WebSocket `Origin` rejected by radiod | Socket fails through nginx | Test; adjust `proxy_set_header Origin` only if required |
| Service worker 404 in GPS/chat | Console errors, no offline shell | Disable registration for the first deploy |
| Chat link 404 | Broken navigation | Hide chat for the first deploy |
| Ports blocked by the firewall | Frontend unreachable | Preflight `ss -ltnp`, `nft`/`ufw`, and VPN rules |
| Two user stores | GUI and frontend users differ | Expected during migration; document it and use a test user |
| Node 24 fleet move | `engines` currently pins `^20.19.0` | Separate follow-up: widen the engine range and update CI before the fleet moves |
| Two deployment contracts | Scripts and installer drift | D11 removes or updates the old scripts |

## Cutover Later

If the new frontend becomes the main UI, swap what listens on `:443` (or keep the
GUI on a legacy port). Ports do not block this. No `basePath` work is involved.

A single-URL `/next` deployment is **not** planned. It would require the
base-path-aware client refactor and a GUI service-worker exclusion first; revisit
only if a single origin becomes a hard requirement.

## Out of Scope

- `/next` subpath deployment and the base-path client refactor.
- Replacing HERMES-GUI at `/`.
- Changing the kiosk browser URL.
- Migrating GUI data or users.
- Deploying `hermes-chat-final` in the first test.
- Running containers on the radio in production.

## Follow-ups

- Confirm artifact delivery (GitHub Release vs local fallback).
- Agree the maintenance window with the bench owners.
- Confirm whether to deploy GPS given `HAS_GPS=false`, or shell only.
- Plan the Node 24 fleet move and widen `engines` when it happens.
- Keep the real station address and certificate name out of the repository.
