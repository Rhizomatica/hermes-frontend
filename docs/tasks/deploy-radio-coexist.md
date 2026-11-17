# Deploy — Radio Coexistence (`/next`) Task List

**Project**: hermes-frontend
**Type**: Deployment / migration
**Branch**: `feature/deploy-radio-coexist`
**Target**: `https://10.70.96.210/`
**Status**: Planning
**Created**: 2026-11-17

---

## Goal

Deploy the new Next.js frontend to the radio at `10.70.96.210` **without replacing
HERMES-GUI**. The existing Angular GUI stays the main interface at `/`. The new
frontend is served under `/next` so both run together for a gradual migration.

The radio daemon (`hermes-radio-daemon`), PHP API, nginx, and the GUI are already
installed and running on the station. This work must not change the GUI's URL,
login, or radio behaviour.

## Decisions

| Decision | Value |
|---|---|
| New frontend URL | `https://10.70.96.210/next` (shell), `/next/gps`, `/next/chat` |
| GUI URL | `https://10.70.96.210/` — unchanged |
| First deploy scope | `hermes-shell` + `hermes-gps` (chat later) |
| Build location | Cross-build ARM64 standalone artifacts on the dev host/CI and ship tarballs |
| Production runtime | Native Node + systemd, no containers |
| Docker | Development, testing, and artifact building only — never production |
| Auth | New frontend uses the radio daemon's `hermes_session` cookie; GUI keeps its own PHP/localStorage login |

## Current State and Gaps

Verified against the repositories:

- HERMES-GUI is an Angular static build in `/var/www/html`, served by nginx on 443
  with `location /` as the catch-all. Its API is the PHP API at `/api`; its radio
  socket is `wss://<host>:8080/websocket`.
- `hermes-installer/conf/web/hermes.conf` owns the 443 server block. Any new
  location must be added without disturbing `/`, `/api`, or the locale routes.
- `hermes-frontend` has three Next.js apps with `output: 'standalone'`. They talk
  to `hermes-radio-daemon` `/api/v2` and use their own `/api/auth/*` routes.
- `hermes-installer/tasks/frontend_setup.sh` exists but is **not wired into
  `installer.sh`** (the task is not in `TASKS`). It also contains stale values:
  `hermes-gps-final`, `NEXT_PUBLIC_RADIO_DAEMON_WS_URL` (code reads
  `NEXT_PUBLIC_WS_URL`), and `HERMES_API_URL=https://<host>/api` (should be the
  daemon on `:8080`).
- `scripts/deploy-sbitx.sh`, `scripts/rollback-sbitx.sh`, and the release workflow
  assume `/opt/hermes/<app>` plus `hermes-<app>.service`. The installer creates
  neither, so there is no agreed deployment contract.
- Client-side code calls `fetch('/api/...')` in many places. Under `/next` those
  requests would hit the GUI's PHP `/api`. **This must be fixed before a subpath
  deploy.**
- `.dockerignore` excludes `.env*`, so cross-built images need explicit build
  args for every `NEXT_PUBLIC_*` value.

## Target Architecture

```
nginx 443 (existing hermes.conf)
  /                 -> /var/www/html              HERMES-GUI (unchanged)
  /api              -> PHP hermes-api             (unchanged)
  /next/            -> 127.0.0.1:4100             hermes-shell
  /next/gps/        -> 127.0.0.1:4101             hermes-gps
  /next/chat/       -> 127.0.0.1:4102             hermes-chat-final (later)
  /next/ws          -> 127.0.0.1:8080/api/v2/ws   radio daemon WebSocket

systemd
  hermes-frontend-shell.service   PORT=4100
  hermes-frontend-gps.service     PORT=4101
  hermes-frontend-chat.service    PORT=4102 (later)
```

Base paths are build-time values:

| App | `NEXT_PUBLIC_BASE_PATH` | Served at |
|---|---|---|
| `hermes-shell` | `/next` | `/next` |
| `hermes-gps` | `/next/gps` | `/next/gps` |
| `hermes-chat-final` | `/next/chat` | `/next/chat` |

## Deployment Contract

### Artifact layout

```
/opt/hermes-frontend/
  releases/<version>/shell/     server.js, .next/static, public
  releases/<version>/gps/
  releases/<version>/chat/
  current -> releases/<version>
  previous -> releases/<version>
  tiles/brazil.pmtiles
```

Each release is immutable. `current` is switched atomically; `previous` enables
rollback. Tile files are not packed into the Next artifact.

### Environment matrix

Build-time (baked into the client bundle):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `/next`, `/next/gps`, `/next/chat` |
| `NEXT_PUBLIC_WS_URL` | `wss://10.70.96.210/next/ws` |
| `NEXT_PUBLIC_SHELL_URL` | `https://10.70.96.210/next` |
| `NEXT_PUBLIC_GPS_URL` | `https://10.70.96.210/next/gps` |
| `NEXT_PUBLIC_CHAT_URL` | `https://10.70.96.210/next/chat` |
| `NEXT_PUBLIC_LOGIN_URL` | `/login` |
| `NEXT_PUBLIC_PMTILES_URL` | `/next/brazil.pmtiles` |
| `NEXT_PUBLIC_APP_TIME_ZONE` | Station timezone |

Runtime (read by the Next server process):

| Variable | Value |
|---|---|
| `HERMES_API_URL` | `https://127.0.0.1:8080` |
| `HERMES_API_TLS_SERVERNAME` | `caldono.hermes.radio` |
| `NODE_EXTRA_CA_CERTS` | Station CA bundle, if the daemon certificate is not publicly trusted |
| `PORT` | `4100` / `4101` / `4102` |
| `HOSTNAME` | `127.0.0.1` |

### Cookies

- `hermes_session` remains HttpOnly and shared by the shell, GPS, and chat apps.
- Set it with `Path=/next` so it is namespaced to the new frontend and never sent
  to GUI or PHP API requests. Update logout to clear the same path.
- Make the display-only `hermes_user` cookie path follow the base path too.
- GUI login is unaffected: it uses `localStorage`, not `hermes_session`.

### systemd units

One unit per app, non-root user (`hermes`), `WorkingDirectory` under `current`,
`EnvironmentFile=/etc/hermes-frontend/<app>.env`, `Restart=on-failure`,
`After=network-online.target`, and no hard dependency on a specific radio
controller unit name. Bind to `127.0.0.1` so only nginx exposes the app.

## Task List

### [ ] D1: BasePath-aware client requests (prerequisite)

**Description**: Introduce a single helper that prefixes client-side paths with
`NEXT_PUBLIC_BASE_PATH`, and replace hardcoded `fetch('/api/...')` calls.

**Files**:
- `packages/api/src/index.ts` or `packages/utils` — export `withBasePath(path)`
- `packages/shared-auth/src/AuthProvider.tsx` — `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`
- `packages/shared-auth/src/tokenStore.ts` — `hermes_user` cookie path
- `packages/shared-auth/src/useAuthGuard.ts` — login redirect
- `apps/hermes-shell/src/hooks/useProfile.ts`, `useStationInfo.ts`, `useUsers.ts`
- `apps/hermes-gps/src/hooks/*` — all `/api/gps/*` fetches

**Acceptance**:
- No client component or hook contains a root-absolute `/api/...` fetch.
- The helper is a no-op when `NEXT_PUBLIC_BASE_PATH` is empty.
- Unit tests cover empty and non-empty base paths.
- `npm run typecheck`, `npm run lint`, `npm test` pass.

**Commit**: `fix(api,shared-auth,shell,gps): make client requests base-path aware`

---

### [ ] D2: Cross-build ARM64 artifacts with public env

**Description**: Make the Docker build accept and bake every `NEXT_PUBLIC_*`
value, then add a script that builds shell + GPS and produces tarballs with
SHA256 checksums.

**Files**:
- `Dockerfile` — `ARG`/`ENV` for the public variables and `GIT_COMMIT_HASH`
- `scripts/build-frontend-arm64.sh` — new script, `--target runner`,
  `--output type=local`, package and checksum
- `.github/workflows/release.yml` — pass the same build args

**Acceptance**:
- `./scripts/build-frontend-arm64.sh /next https://10.70.96.210` produces
  `hermes-shell-*.tar.gz` and `hermes-gps-*.tar.gz`.
- The built `server.js` and client chunks contain the expected base path.
- No `.env*` file is required in the build context.

**Commit**: `build(repo): cross-build frontend artifacts with public env`

---

### [ ] D3: Installer deployment contract

**Description**: Define and implement the artifact layout, environment files,
ownership, and release symlinks that both the installer and manual deploy use.

**Acceptance**:
- `/opt/hermes-frontend/releases/<version>/{shell,gps}` exists and is readable
  by the service user.
- `/opt/hermes-frontend/current` points to the installed release.
- `/etc/hermes-frontend/{shell,gps}.env` contains only runtime variables.
- A repeated install preserves `previous` and does not delete the GUI tree.

**Commit**: `feat(repo): define frontend release layout and runtime env`

---

### [ ] D4: systemd units

**Description**: Add and install `hermes-frontend-shell.service` and
`hermes-frontend-gps.service` (chat unit prepared but disabled).

**Acceptance**:
- Units run as `hermes`, bind to `127.0.0.1`, and restart on failure.
- `systemctl start hermes-frontend-shell hermes-frontend-gps` succeeds.
- Apps survive `systemctl daemon-reload` and a station reboot.
- Logs are available through `journalctl -u hermes-frontend-*`.

**Commit**: `feat(repo): add frontend systemd units`

---

### [ ] D5: nginx `/next` coexistence and WebSocket proxy

**Description**: Add a snippet included by the existing 443 server block. Do not
modify `/`, `/api`, or the locale routes.

**Rules**:
- `location = /next { return 301 /next/; }`
- `location /next/ws` proxies to the daemon's `/api/v2/ws` with HTTP/1.1 upgrade
  headers and TLS to `127.0.0.1:8080` using SNI `caldono.hermes.radio`.
- `location /next/gps/` -> 4101, `location /next/chat/` -> 4102,
  `location /next/` -> 4100. Do **not** strip the `/next` prefix: each Next
  server is built with its base path.
- Forward `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.

**Acceptance**:
- `curl -I https://10.70.96.210/` still returns the GUI.
- `curl -I https://10.70.96.210/api` still reaches PHP.
- `curl -I https://10.70.96.210/next` reaches the shell with 200/307.
- Assets under `/next/_next/...` and `/next/gps/_next/...` load with 200.
- The WebSocket connects through `/next/ws`.

**Commit**: `feat(repo): route /next to the frontend and proxy the daemon socket`

---

### [ ] D6: Wire a real `frontend` task into hermes-installer

**Description**: Replace the orphan `frontend_setup.sh` with an artifact-based
task. Add it to `installer.sh` imports, `TASKS`, descriptions, and `run_task`.

**Acceptance**:
- `./installer.sh --list-tasks` shows `frontend`.
- The task does not clone or build the monorepo on the station.
- `HERMES_FRONTEND_APPS` selects `shell`, `gps`, `chat`, or a combination.
- `HERMES_FRONTEND_PATH` defaults to `/next`.
- Re-running the task is idempotent and keeps `previous`.
- Docker is not required on the station.

**Commit**: `feat(repo): install prebuilt frontend artifacts from the installer`

---

### [ ] D7: First deploy on the radio (shell + GPS)

**Description**: Execute the runbook on `10.70.96.210` during a maintenance
window. The GUI must remain available throughout.

**Runbook**:
1. Record the current GUI state and take a station config backup.
2. Cross-build shell + GPS for `/next` and copy the tarballs to the station.
3. Install into `/opt/hermes-frontend/releases/<version>/`.
4. Install runtime env files and systemd units.
5. Add the nginx snippet and run `nginx -t` before reloading.
6. Enable and start the two new units.
7. Run the validation checklist in D8.

**Acceptance**:
- GUI at `/` is unchanged before, during, and after the deploy.
- New frontend login and GPS work at `/next`.
- No changes to the kiosk URL are made in this task.

---

### [ ] D8: Validation checklist

**GUI regression**:
- [ ] `https://10.70.96.210/` loads the GUI.
- [ ] GUI login, radio status, messages, and station pages still work.
- [ ] `wss://10.70.96.210:8080/websocket` still connects.

**New frontend**:
- [ ] `https://10.70.96.210/next` redirects to login when unauthenticated.
- [ ] Login succeeds with a daemon user; `hermes_session` is set with `Path=/next`.
- [ ] App selector links point to `/next/gps` and `/next/chat`.
- [ ] `/next/gps` loads, map tiles render, and GPS data updates.
- [ ] Logout clears the session and returns to `/next/login`.
- [ ] A hard refresh on `/next/gps` does not 404.
- [ ] Browser console has no mixed-content or CSP errors.

**System**:
- [ ] Both units start on reboot.
- [ ] Memory use stays within the ADR-008 budget.
- [ ] `journalctl` shows no TLS or proxy errors.

---

### [ ] D9: Rollback

**Description**: Document and script rollback without touching the GUI.

**Runbook**:
1. `systemctl disable --now hermes-frontend-shell hermes-frontend-gps`.
2. Remove the `include` line or snippet from nginx and run `nginx -t` then reload.
3. Optionally repoint `current` to `previous` and restart the units.

**Acceptance**:
- Rollback restores the pre-deploy state with the GUI still serving `/`.
- The procedure is tested once on the station.

---

### [ ] D10: Documentation and Docker policy

**Description**: Record the runtime decision and remove stale assumptions.

**Files**:
- `docs/adr/ADR-008-sbitx-deployment.md` — Docker is build/test only; production
  is standalone artifacts + systemd.
- `README.md` — replace the sBitx deploy section with the `/next` runbook.
- `.env.example` — document build-time vs runtime variables and remove the stale
  `NEXT_PUBLIC_RADIO_DAEMON_WS_URL`.
- `hermes-installer` README/docs — describe the new `frontend` task.

**Commit**: `docs(repo): document radio coexistence deployment and Docker policy`

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Hardcoded `/api` fetches under `/next` | Login and data requests hit the PHP API | D1 is a hard prerequisite |
| Build-time public env | Artifacts are station-specific | Build per target URL; keep the build script parameterised |
| TLS trust from Next to daemon | Server-side API calls fail | Trust the station CA via `NODE_EXTRA_CA_CERTS`; keep `servername` set |
| Browser certificate on `wss://<ip>:8080` | WebSocket refused | Proxy the socket through nginx at `/next/ws` |
| nginx location conflicts | GUI or `/api` regression | Longest-prefix `location /next/...`; never edit `location /` |
| `hermes_session` leakage | Cookie sent to GUI/PHP | Set `Path=/next` |
| Two user stores | GUI and frontend users differ | Expected during migration; document it and use a test user |
| GPS tile size | Artifact bloat / disk pressure | Serve `brazil.pmtiles` from `/opt/hermes-frontend/tiles` |
| Installer assumptions | Broken repeat deploys | D3 and D6 define one contract; test a reinstall |

## Out of Scope

- Replacing HERMES-GUI at `/`.
- Changing the kiosk browser URL.
- Migrating GUI data or users.
- Deploying `hermes-chat-final` in the first test.
- Running containers on the radio in production.
