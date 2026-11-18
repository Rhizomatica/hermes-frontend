# Deploy — Radio Coexistence (Multi-Port) Task List

**Project**: hermes-frontend
**Type**: Deployment / migration
**Branch**: `feature/deploy-radio-coexist`
**Target**: `https://10.70.96.210/`
**Status**: Planning
**Created**: 2026-11-17
**Revised**: 2026-11-17 — ports are the deployment model; `/next` is out of scope

---

## Goal

Deploy the new Next.js frontend to the radio at `10.70.96.210` **without replacing
HERMES-GUI**. The existing Angular GUI stays the main interface at `/`. The new
frontend runs on its own HTTPS ports so both run together for a gradual migration.

The radio daemon (`hermes-radio-daemon`), PHP API, nginx, and the GUI are already
installed and running on the station. This work must not change the GUI's URL,
login, or radio behaviour.

## Decisions

| Decision | Value |
|---|---|
| Coexistence model | Separate HTTPS ports, permanently |
| GUI | `https://10.70.96.210/` — unchanged |
| Shell | `https://10.70.96.210:4000/` |
| GPS | `https://10.70.96.210:4001/` |
| Chat | `https://10.70.96.210:4002/` (later) |
| Public base path | Empty for every app |
| Build URL | `https://10.70.96.210` (IP address) — provisional, confirm at D1 |
| First deploy scope | `hermes-shell` + `hermes-gps` |
| Build location | Cross-build ARM64 standalone artifacts on the dev host/CI and ship tarballs |
| Artifact delivery | GitHub Release assets via `HERMES_FRONTEND_RELEASE_URL` plus SHA256; local `HERMES_FRONTEND_ARTIFACTS` fallback for air-gapped installs — provisional, confirm at D1 |
| Node runtime | System `/usr/bin/node` when it is >= 20.19; otherwise a pinned Node 20.19 runtime under `/opt/hermes-frontend/runtime` — provisional, confirm at D1 |
| Installer default | Install files, units, and nginx snippet; do not enable/start unless `HERMES_FRONTEND_ENABLE=true` |
| WebSocket | Proxied at `/ws` on each frontend port with upstream TLS verification |
| Production runtime | Native Node + systemd, no containers |
| Docker | Development, testing, and artifact building only — never production |
| Auth | Host-scoped `hermes_session` cookie shared across ports; GUI keeps its own PHP/localStorage login |

## Decision Gates

Three decisions are provisional and are settled by D1:

| Decision | D1 input | Default if the input is unavailable |
|---|---|---|
| Build URL | Certificate SANs; whether the station hostname resolves | Keep the IP `10.70.96.210` |
| Artifact delivery | Whether GitHub Releases are reachable from the station | Use a local `HERMES_FRONTEND_ARTIFACTS` directory |
| Node runtime | `node --version` on the station | Install the pinned Node 20.19 runtime |

Gates:
- **D2 is blocked** until the build URL is confirmed.
- **D8 is blocked** until artifact delivery and Node runtime are confirmed.
- Every other decision in the table above is not gated and can proceed.

## Why Ports

Separate ports are the intended architecture, not a temporary step:

- A service worker on `:443` cannot control `:4000`; the GUI's Angular service
  worker cannot intercept the new frontend.
- No `basePath` support or client `fetch('/api/...')` refactor is required.
- Theme, locale, and session cookies are host-scoped and already shared across
  ports (`ThemeProvider`, `LocaleProvider`, `hermes_session`).
- The code already supports absolute cross-app URLs and cross-origin login
  redirects; this is how the apps run in development.
- The GUI's PHP `/api` and the new frontend's Next `/api` routes stay in separate
  origins, so they can coexist indefinitely without a namespace collision.
- A future cutover is still possible: move the winning UI to `:443` and the GUI
  to a legacy port. No path migration is involved.

The shell is the intended single entry point for the new frontend; its app
selector links to `:4001` and `:4002`. During the first deploy the kiosk stays on
the GUI; it can be pointed at `:4000` later for the trial.

## Current State and Gaps

Verified against the repositories:

- HERMES-GUI is an Angular static build in `/var/www/html`, served by nginx on 443
  with `location /` as the catch-all. Its API is the PHP API at `/api`; its radio
  socket is `wss://<host>:8080/websocket`.
- HERMES-GUI registers `ngsw-worker.js` in production with the default scope `/`.
  Because the new frontend is on a different port, this is harmless.
- `hermes-frontend` has three Next.js apps with `output: 'standalone'`. They talk
  to `hermes-radio-daemon` `/api/v2` and use their own `/api/auth/*` routes.
- The real standalone layout is `apps/<app>/server.js` plus a sibling
  `node_modules/`; it is **not** a flat `server.js` at the release root.
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

## Target Architecture

```
nginx 443            -> /var/www/html                 HERMES-GUI (unchanged)
nginx 8080 (daemon)  -> hermes-radio-daemon           REST /api/v2 + WebSocket
nginx 4000 (TLS)     -> 127.0.0.1:4100                hermes-shell
nginx 4001 (TLS)     -> 127.0.0.1:4101                hermes-gps
nginx 4002 (TLS)     -> 127.0.0.1:4102                hermes-chat-final (later)

Each new server block also proxies:
  /ws                -> https://127.0.0.1:8080/api/v2/ws
  4001 only: /brazil.pmtiles -> /opt/hermes-frontend/tiles/brazil.pmtiles

Browser:
  https://10.70.96.210:4000       shell, wss://10.70.96.210:4000/ws
  https://10.70.96.210:4001       gps,   wss://10.70.96.210:4001/ws
```

Systemd binds the Next servers to `127.0.0.1`; only nginx exposes them.

The build uses the IP address, so the station certificate may not match and the
browser will show the same name-mismatch warning as the GUI. Accept it once for
the test. The WebSocket is proxied through the same origin so it does not add a
second certificate failure.

## Deployment Contract

### Ports

| Public | Internal | App | Notes |
|---|---|---|---|
| 443 | — | HERMES-GUI | unchanged |
| 8080 | — | radio daemon | existing, TLS |
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

### Environment matrix

Build-time (baked into the client bundle; each app is built separately):

| Variable | Shell | GPS |
|---|---|---|
| `NEXT_PUBLIC_BASE_PATH` | empty | empty |
| `NEXT_PUBLIC_SHELL_URL` | `https://10.70.96.210:4000` | `https://10.70.96.210:4000` |
| `NEXT_PUBLIC_GPS_URL` | `https://10.70.96.210:4001` | `https://10.70.96.210:4001` |
| `NEXT_PUBLIC_CHAT_URL` | `https://10.70.96.210:4002` | — |
| `NEXT_PUBLIC_ENABLE_CHAT` | `false` for first deploy | — |
| `NEXT_PUBLIC_LOGIN_URL` | `/login` | — |
| `NEXT_PUBLIC_WS_URL` | `wss://10.70.96.210:4000/ws` | `wss://10.70.96.210:4001/ws` |
| `NEXT_PUBLIC_PMTILES_URL` | — | `/brazil.pmtiles` |
| `NEXT_PUBLIC_APP_TIME_ZONE` | station timezone | station timezone |

Runtime (read by the Next server process):

| Variable | Value |
|---|---|
| `HERMES_API_URL` | `https://127.0.0.1:8080` |
| `HERMES_API_TLS_SERVERNAME` | Station certificate name (e.g. `caldono.hermes.radio`) |
| `NODE_EXTRA_CA_CERTS` | Station CA bundle when the daemon certificate is not publicly trusted |
| `PORT` | `4100` / `4101` / `4102` |
| `HOSTNAME` | `127.0.0.1` |
| `NODE_ENV` | `production` |

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
- The shell may keep its own service worker on `:4000`.

### systemd

One unit per app: `hermes-frontend-shell`, `hermes-frontend-gps`, and later
`hermes-frontend-chat`.

- Non-root user `hermes`.
- `WorkingDirectory=/opt/hermes-frontend/current/<app>`.
- `ExecStart=/usr/bin/node apps/<app>/server.js`.
- `EnvironmentFile=/etc/hermes-frontend/<app>.env`.
- `Restart=on-failure`, `After=network-online.target`.
- No hard dependency on a specific radio controller unit name.

### nginx

One TLS `server` block per public port. Reuse the station certificate.

- `location /` proxies to the matching internal port. Do **not** rewrite the URI;
  the apps are built with an empty base path.
- `location = /ws` proxies to `https://127.0.0.1:8080/api/v2/ws` with HTTP/1.1
  upgrade headers and upstream TLS (`proxy_ssl_server_name`,
  `proxy_ssl_name <station name>`, CA verification).
- On `:4001`, `location = /brazil.pmtiles` serves
  `/opt/hermes-frontend/tiles/brazil.pmtiles` with range support.
- Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.
- Set `client_max_body_size 100M`.
- The new blocks own their headers; the GUI's CSP header does not apply here.

## Task List

### [ ] D1: Station preflight audit

**Description**: Read-only checks on `10.70.96.210` before changing anything.
This task resolves the three provisional decisions (build URL, artifact
delivery, Node runtime) and produces the inputs for D2 and D8.

**Acceptance**:
- Debian version, free disk, and free RAM recorded.
- `node --version` recorded; it must be >= 20.19 or the pinned-runtime fallback is
  planned.
- GitHub Releases reachable from the station, or a local artifact source is
  confirmed.
- `4000-4002` are free and allowed through the firewall/VPN.
- Daemon REST/WS listen address confirmed (`127.0.0.1:8080` or station address).
- Certificate SANs and the daemon CA recorded; `NODE_EXTRA_CA_CERTS` path chosen.
  Note that accessing by IP will show a name-mismatch warning if the certificate
  has no IP SAN.
- PHP API confirmed not to use a `hermes_session` cookie.
- GUI and daemon currently healthy; a config backup is taken.
- A test daemon user is available.
- The build URL, artifact delivery, and Node runtime decisions are recorded in
  this document.

---

### [ ] D2: Cross-build ARM64 artifacts

**Description**: Make the Docker build accept and bake every `NEXT_PUBLIC_*`
value, then publish shell and GPS as GitHub Release assets with checksums and a
build manifest. The build uses `https://10.70.96.210` as the target URL.

**Files**:
- `Dockerfile` — `ARG`/`ENV` for the public variables and `GIT_COMMIT_HASH`
- `scripts/build-frontend-arm64.sh` — new script using `--target runner` and
  `--output type=local`
- `.github/workflows/release.yml` — pass the same build args and publish the
  tarballs, `.sha256` files, and manifest as release assets

**Acceptance**:
- Produces `hermes-shell-*.tar.gz` and `hermes-gps-*.tar.gz` plus `.sha256`.
- The manifest records the target URLs, version, and build time.
- The GitHub Release contains every asset the installer expects.
- No `.env*` file is required in the build context.
- The tarball keeps the `apps/<app>/server.js` + `node_modules` layout.

---

### [ ] D3: Deployment contract and release layout

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

---

### [ ] D4: systemd units

**Description**: Add and install `hermes-frontend-shell.service` and
`hermes-frontend-gps.service`; prepare the chat unit but keep it disabled.

**Acceptance**:
- Units run as `hermes`, bind to `127.0.0.1`, and restart on failure.
- `systemctl start hermes-frontend-shell hermes-frontend-gps` succeeds.
- Apps survive `daemon-reload` and a station reboot.
- Logs are available through `journalctl -u hermes-frontend-*`.

---

### [ ] D5: nginx multi-port coexistence

**Description**: Add three TLS server blocks (chat can be added later) without
modifying the existing 443 block.

**Acceptance**:
- `https://10.70.96.210:4000` reaches the shell; `:4001` reaches GPS.
- `https://10.70.96.210/` still returns the GUI; `/api` still reaches PHP.
- Assets load from each app's own origin.
- `wss://<host>:4000/ws` and `wss://<host>:4001/ws` connect to the daemon.
- `https://10.70.96.210:4001/brazil.pmtiles` serves the tile file.
- `nginx -t` passes before reload.

---

### [ ] D6: Wire a real `frontend` task into hermes-installer

**Description**: Replace the orphan `frontend_setup.sh` with an artifact-based
task. Add it to `installer.sh` imports, `TASKS`, descriptions, and `run_task`.

**Acceptance**:
- `./installer.sh --list-tasks` shows `frontend`.
- The task does not clone or build the monorepo on the station and does not
  require Docker.
- `HERMES_FRONTEND_APPS` selects `shell`, `gps`, `chat`, or a combination.
- `HERMES_FRONTEND_RELEASE_URL` is used by default; `HERMES_FRONTEND_ARTIFACTS`
  works as the local fallback. Both are checksum-verified.
- Runtime env derives the daemon TLS name from the station, not a hardcoded
  `caldono.hermes.radio`.
- The task installs files, units, and the nginx snippet but does **not** enable
  or start the units. `HERMES_FRONTEND_ENABLE=true` opts into start.
- Re-running the task is idempotent and keeps `previous`.
- The task runs after `webserver` and `hermesnet`, before `db` and `firstboot`.

---

### [ ] D7: First-deploy app adjustments

**Description**: Small code changes required by the ports model and the
shell + GPS scope.

**Files**:
- `apps/hermes-shell/src/app/page.tsx` — hide Chat when not deployed
- `apps/hermes-gps/src/app/page.tsx` — fix `SHELL_URL` default and `href`
- `apps/hermes-shell/src/app/api/auth/login/route.ts` — add `Secure`
- `apps/hermes-gps/src/app/layout.tsx` and chat layout — disable service worker
  registration for now

**Acceptance**:
- No Chat link is rendered for the first deploy.
- The GPS "Back to Hermes" link is a plain absolute URL.
- The session cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`.
- GPS and chat do not request a missing `/sw.js`.

---

### [ ] D8: First deploy on the radio (shell + GPS)

**Description**: Execute the runbook on `10.70.96.210` during a maintenance
window. The GUI must remain available throughout.

**Runbook**:
1. Record the current GUI state and take a station config backup.
2. Publish or fetch the shell + GPS release assets and verify their checksums.
3. Install into `/opt/hermes-frontend/releases/<version>/` and switch `current`.
4. Install runtime env files and systemd units.
5. Add the new nginx server blocks; run `nginx -t` before reloading.
6. Start the two units manually for the test (the installer does not start them
   by default).
7. Run the validation checklist in D9.

**Acceptance**:
- GUI at `/` is unchanged before, during, and after the deploy.
- New frontend login and GPS work at `:4000` and `:4001`.
- No changes to the kiosk URL are made in this task.

---

### [ ] D9: Validation checklist

**GUI regression**:
- [ ] `https://10.70.96.210/` loads the GUI.
- [ ] GUI login, radio status, messages, and station pages still work.
- [ ] `wss://10.70.96.210:8080/websocket` still connects.

**New frontend**:
- [ ] The certificate warning for the IP address is accepted once, as with the GUI.
- [ ] `https://10.70.96.210:4000` redirects to `/login` when unauthenticated.
- [ ] Login succeeds with a daemon user; session is shared with `:4001`.
- [ ] App selector links to `https://10.70.96.210:4001`.
- [ ] `:4001` loads, tiles render, and GPS data updates.
- [ ] Logout clears the session and returns to `:4000/login`.
- [ ] A hard refresh on a deep route does not 404.
- [ ] `wss://<host>:4000/ws` connects and receives updates.
- [ ] Browser console has no mixed-content or CSP errors.
- [ ] The GUI's service worker does not affect `:4000`/`:4001`.

**System**:
- [ ] Both units start on reboot.
- [ ] Memory use stays within the ADR-008 budget.
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
  `NEXT_PUBLIC_RADIO_DAEMON_WS_URL`.
- `scripts/deploy-sbitx.sh`, `scripts/rollback-sbitx.sh` — update to the new
  contract or remove.
- `.github/workflows/release.yml` — remove or rewrite the placeholder
  staging/production deploy jobs.
- `hermes-installer` README/docs — describe the new `frontend` task.

**Commit**: `docs(repo): document multi-port radio coexistence and Docker policy`

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| PHP API also uses `hermes_session` | Cookie collision across ports | Preflight; use a distinct cookie name and translate to `Authorization` |
| Daemon certificate not trusted by Node | Server-side API calls fail | `NODE_EXTRA_CA_CERTS` pointing at the CA; confirm the daemon bind address |
| Station Node is older than 20.19 | Next servers will not start | Install the pinned Node 20.19 runtime and point systemd at it |
| GitHub Releases unreachable from the station | Installer cannot fetch artifacts | Support `HERMES_FRONTEND_ARTIFACTS` as a local fallback; verify checksums |
| IP address baked into the build | Moving the station requires a rebuild | Accept for the first test; parameterize per station later |
| Certificate SAN does not include the IP | Browser warning | Accept once; the WebSocket is proxied on the same origin so it adds no second failure |
| WebSocket `Origin` rejected by the daemon | Socket fails through nginx | Test; adjust `proxy_set_header Origin` only if required |
| Service worker 404 in GPS/chat | Console errors, no offline shell | Disable registration for the first deploy |
| Chat link 404 | Broken navigation | Hide chat for the first deploy |
| Memory use of two/three Next servers | Exceeds the 2-4 GB station budget | Measure; set `NODE_OPTIONS=--max-old-space-size`; add chat only after measuring |
| Ports blocked by the firewall | Frontend unreachable | Preflight `ss -ltnp`, `nft`/`ufw`, and VPN rules |
| Two user stores | GUI and frontend users differ | Expected during migration; document it and use a test user |
| Station-specific build-time URLs | Artifacts cannot be reused across stations | Build per target URL; record a manifest and checksums |
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
