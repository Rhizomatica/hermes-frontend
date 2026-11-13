# User CRUD — Frontend Implementation Plan

**App**: `apps/hermes-shell`
**Backend reference**: `hermes-radio-daemon` branch `user-crud-review`
**Backend spec**: `api/spec/api-rest.yaml` (`users` tag)
**Status**: Implemented (pending review)

---

## 1. Scope

Implement user administration and self-service profile editing in `hermes-shell`:

- Admins: list, create, edit, disable, delete users, reset passwords.
- Any authenticated user: view/edit their own profile (display name, phone, location) and change their own password.
- The reserved `root` recovery account is visible but immutable (no edit, delete, or password change).

Out of scope for this iteration (not implemented by the backend branch either):

- Avatar upload/delete (`/users/{id}/avatar`).
- LXMF identity export and device management.
- Mailbox operations beyond the daemon's own side effects.
- Server-side user search/filter (the list endpoint only supports `limit` + `cursor`; search is client-side over loaded pages).

The chosen UI home is `hermes-shell` because it already owns auth, navigation, the station dashboard, and the shared i18n bundle. No new app or nginx path is required.

---

## 2. Backend contract to honor

All paths are under `/api/v2`.

| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/users?limit=&cursor=` | admin | `UserPage`: `{ data: User[], next_cursor? }` |
| POST | `/users` | admin | `UserCreate`; 201 `User`; 409 username taken; 422 field errors |
| GET | `/users/{id}` | admin or self | 403 for another user |
| PATCH | `/users/{id}` | admin or self | `UserPatch`; `role`, `locale`, `disabled` admin-only; 403 for `root` |
| DELETE | `/users/{id}` | admin | 204; 403 for `root`; admins may delete themselves |
| PUT | `/users/{id}/password` | admin or self | `{ current_password?, new_password }`; non-admin needs current; 403 for `root`; ends other sessions |

Important invariants from `user-crud-review`:

- Username `root` is reserved at creation.
- `root` cannot be patched, deleted, or have its password changed.
- Deleting the last admin is no longer blocked; do not add that guard in the client.
- `display_name` is at most 64 characters, counted in Unicode code points.
- `username` matches `^[a-z0-9._-]{1,32}$`.
- Allowed roles: `readonly`, `user`, `operator`, `admin`.
- Allowed locales: `en`, `es`, `pt-BR`, `fr`.
- `phone` in `UserCreate` is a string; in `UserPatch` it is `string | null` (null clears). Same for `location`.
- Errors are RFC 9457 `application/problem+json`, with per-field validation under `errors: Record<string, string[]>` for 422.
- Pagination uses an opaque `cursor`; `next_cursor` is absent/empty on the last page.

`HermesUser` in `packages/api/src/types.ts` already matches the backend `User` schema, so no breaking type change is needed.

---

## 3. Architecture decisions

1. **Proxy through `hermes-shell` API routes.** Browser code never talks to the daemon directly. Each route forwards `cookie` and `authorization` the same way `apps/hermes-shell/src/app/api/system/route.ts` does.
2. **Authorization is server-side only.** `useAuth().user.role` gates navigation and buttons for usability; it is never trusted as a security boundary (see `docs/audit/2026-08-20-architecture-audit-phase-2-gps.md`, F3). Proxies must not authorize from client cookies.
3. **Data hooks follow the `ServerState<T>` pattern** (`docs/governance/engineering-standards.md` §4.2), with module-level in-flight deduplication and previous data retained on refresh failure.
4. **Dialogs reuse `@hermes/ui`.** Deletion uses `ConfirmDialog`; password flows use `PasswordDialog`, extended only if current-password + new-password are both needed in one modal.
5. **i18n first.** Every string goes into `apps/hermes-shell/messages/en.json` and `pt.json`.
6. **sBitx constraints.** Design at 800×480 touch first: 44px targets, no wide tables that require horizontal scrolling, list rows instead of a dense data grid on small widths.

---

## 4. Work breakdown

### Task 1 — API client primitives (`packages/api`)

- Add `hermesPut(path, body, cookie?, authorization?)` and export it from `packages/api/src/index.ts`.
- Add a `Problem` type (`type`, `title`, `status`, `code`, `detail?`, `errors?`, `request_id?`) for `application/problem+json` responses.
- Add `UserPage`, `UserCreate`, `UserPatch`, `PasswordChange` types to `packages/api/src/types.ts` and re-export from `index.ts`. Keep `HermesUser` as the canonical `User`.
- Optionally add a small `problemFrom(data)` helper used by hooks/pages to produce human messages and field errors.

**Commit**: `feat(api): add user CRUD types and PUT support`

### Task 2 — Shell API proxy routes

Create under `apps/hermes-shell/src/app/api/users/`:

- `route.ts` — `GET` list (pass through `limit`, `cursor`) and `POST` create.
- `[userId]/route.ts` — `GET`, `PATCH`, `DELETE`.
- `[userId]/password/route.ts` — `PUT`.

Rules for every handler:

- Validate `userId` is a positive integer before forwarding; answer 400 otherwise.
- Parse JSON safely for POST/PATCH/PUT; answer 400 on invalid JSON.
- Forward the daemon's status and body unchanged (including problem+json), so 403/404/409/422 reach the UI intact.
- Log only unexpected failures with `console.error` and the handler name, matching existing routes.

**Commit**: `feat(shell): proxy user CRUD endpoints`

### Task 3 — Hooks and helpers

Add `apps/hermes-shell/src/hooks/useUsers.ts`:

- `ServerState`-style list with `users`, `nextCursor`, `loading`, `loadingMore`, `error`, `refresh`, `loadMore`.
- Mutations: `createUser`, `updateUser`, `deleteUser`, `setPassword`, each returning `{ ok, fieldErrors?, message? }` rather than throwing for expected 4xx responses.
- After a successful mutation, refresh the first page (or update the row in place where simple).
- Respect the daemon's pagination semantics; do not assume stable ordering across pages.

Add `apps/hermes-shell/src/hooks/useProfile.ts` (or extend `useUsers` with a single-user mode):

- Load `/api/users/{id}` for the current user.
- `updateProfile` for `display_name`/`phone`/`location`.
- `changePassword` with `current_password` + `new_password`.

Add `apps/hermes-shell/src/lib/problem.ts`:

- Parse problem+json into `{ message, fieldErrors }`.
- Map known codes (`conflict`, `forbidden`, `not_found`, `invalid`, `internal`) to i18n keys; fall back to `detail`/`title`.

**Commit**: `feat(shell): add user crud hooks and problem parsing`

### Task 4 — Shared user UI components

Create `apps/hermes-shell/src/components/users/`:

- `UsersPanel.tsx` — page-level container: header, create button (admin), search input, list, load-more, empty/loading/error states.
- `UserList.tsx` — responsive rows/cards; shows display name or username, username, role, locale, disabled badge, last login; root badge.
- `UserFormDialog.tsx` — create/edit form. Create fields: username, password, display name, role, locale, phone, location. Edit fields: display name, role, locale, phone, location, disabled. Enforce client-side constraints mirroring the spec and surface server `errors` next to fields.
- `DeleteUserDialog.tsx` — `ConfirmDialog` wrapper naming the user; never available for `root`.
- `SetPasswordDialog.tsx` — admin reset (new password only) and self change (current + new), built on `PasswordDialog` or a small extension.

Behavior:

- Hide role/locale/disabled controls for non-admin editors.
- For `root`, disable edit/delete/password actions and show an explanatory label.
- Prevent a user from deleting/disabling themselves via UI warnings; backend rules win if bypassed.
- Client-side search filters the loaded users by username/display name; state that it covers loaded pages only (or hide search until backend supports `q`).

**Commit**: `feat(shell): add user management components`

### Task 5 — Pages and navigation

- `apps/hermes-shell/src/app/users/page.tsx` — admin-only management page. If the authenticated role is not `admin`, render a forbidden/empty state with a link home (server still enforces).
- `apps/hermes-shell/src/app/profile/page.tsx` — self-service profile: editable display name, phone, location; read-only username/role/locale/created/last-login; change-password action.
- Update `apps/hermes-shell/src/app/page.tsx`:
  - Add a “Users” app card/link, visible only for admins.
  - Add a “Profile” link from the greeting/user section.
- Keep “Back to HERMES” navigation consistent with `hermes-gps`.

**Commit**: `feat(shell): add users and profile pages`

### Task 6 — i18n

Add namespaces to both `messages/en.json` and `messages/pt.json`:

- `users.*` — title, create, edit, delete, disable/enable, resetPassword, fields, roles, locales, badges, confirmations, empty/loading/error, validation messages, root explanation.
- `profile.*` — title, account info labels, save, changePassword, current/new password, success/error.
- `home.users`, `home.usersDescription`, `home.profile`.

Use ICU placeholders for names (`{name}`, `{username}`). No hardcoded strings in components.

**Commit**: `feat(shell): localize user management`

### Task 7 — Tests

Unit/component:

- `lib/problem.test.ts` — problem+json parsing, field errors, fallbacks.
- `hooks/useUsers.test.ts` — loading, data, pagination, refresh failure retains data, create/update/delete/password success and 4xx paths.
- `hooks/useProfile.test.ts` — load, save, password change, field errors.
- `components/users/*.test.tsx` — form validation, role/locale controls hidden for non-admin, root actions disabled, delete confirmation, password dialog, list rendering.
- `app/users/page.test.tsx` — admin vs non-admin states.
- `app/profile/page.test.tsx` — fields and submit flows.
- API route handler tests with `@hermes/api` mocked: forwarding cookie/auth, ID validation, status/body passthrough.

E2E (optional, Playwright in `apps/hermes-shell/e2e/`):

- Admin logs in → creates a user → edits it → disables it → resets password → deletes it.
- Non-admin cannot open `/users`.
- Root row has no mutating actions.

Add Vitest aliases in `vitest.config.ts` for any new `@/components/users/*`, `@/hooks/useUsers`, `@/hooks/useProfile`, and `@/lib/problem` imports, because the root config maps `@/` per-file rather than per-app.

**Commit**: `test(shell): cover user crud flows`

### Task 8 — Verification and docs

Run from the repo root:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Update:

- `docs/phase-2-progress.md` or the current progress doc with this feature’s status.
- `docs/architecture/frontend-overview.md` if the shell route map is documented there.
- Manual checklist at 800×480 and ≥1024px, light/dark, en/pt.

**Commit**: `docs(shell): document user management`

---

## 5. Acceptance criteria

- An admin can list, paginate, create, edit, disable/enable, delete users, and reset passwords.
- Creating a duplicate username shows a field/conflict error; invalid fields show inline messages sourced from the daemon’s 422 `errors`.
- `root` is listed, clearly marked, and has no edit/delete/password controls.
- A non-admin sees only their own profile, can edit display name/phone/location, and can change their password with the current one.
- Non-admins never see the Users navigation entry; direct `/users` access shows a forbidden state.
- All requests flow through shell API routes with cookie/authorization forwarding; no direct browser-to-daemon calls.
- All user-facing strings exist in `en.json` and `pt.json`.
- Unit tests cover hooks, helpers, components, pages, and proxy routes; TypeScript, lint, tests, and build pass.
- UI remains usable on 800×480 with touch-sized targets and no horizontal scrolling.

---

## 6. Risks and notes

- **Role claims are client-controllable** (`hermes_user` cookie). Treat role checks as UI-only. Do not add authorization decisions in Next.js proxy routes based on the cookie; the daemon is the authority.
- **No backend search/filter.** Client-side filtering can be misleading; either label it clearly or defer until the daemon adds a query parameter.
- **Optimistic updates are risky** for roles/disabled because the daemon may reject root or self operations. Prefer refresh-after-mutation.
- **Password change ends other sessions.** After an admin resets a password, that user’s other sessions are invalidated by design; surface this in the confirmation text.
- **Mailbox creation is a backend side effect.** Create/delete can be slower than expected; show pending states and disable double submits.
- **`root` is a recovery account.** Do not offer “change password” shortcuts that only work for other users; the backend will return 403.
