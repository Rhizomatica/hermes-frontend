# HERMES Frontend — Engineering Standards

**Project**: hermes-fronted
**Last Updated**: 2026-08-06
**Version**: 1.0.0

---

## Purpose

This document defines the engineering standards, conventions, and patterns that govern all code in the Hermes frontend monorepo. Every developer, PR reviewer, and maintainer is expected to enforce these standards.

---

## 1. Commit Conventions

### 1.1 Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Enforced by `commitlint`.

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 1.2 Allowed Types

| Type | Usage | Example |
|---|---|---|
| `feat` | New feature (triggers minor version bump in packages) | `feat(chat): add offline message queue` |
| `fix` | Bug fix (triggers patch version bump) | `fix(gps): correct DMS coordinate formatting` |
| `perf` | Performance improvement | `perf(chat): virtualize message list for large histories` |
| `a11y` | Accessibility improvement | `a11y(login): add aria-describedby for error messages` |
| `style` | Code style (formatting, missing semicolons) — no logic change | `style: run prettier across project` |
| `refactor` | Code refactoring — no behavior change | `refactor(api): extract normalize utilities to shared package` |
| `docs` | Documentation only | `docs: add ADR for sBitx deployment` |
| `test` | Adding or updating tests | `test(chat): add useChatData integration tests` |
| `chore` | Build, CI, dependencies, tooling | `chore: update turbo to v2.10` |
| `revert` | Reverting a previous commit | `revert: feat(chat): add typing indicators` (HF rejected) |

### 1.3 Scope Values

| Scope | Applies To |
|---|---|
| `shell` | `apps/hermes-shell` |
| `gps` | `apps/hermes-gps-final` |
| `chat` | `apps/hermes-chat-final` |
| `api` | `packages/api` |
| `ui` | `packages/ui` |
| `shared-auth` | `packages/shared-auth` |
| `tailwind-config` | `packages/tailwind-config` |
| `config` | `packages/config` |
| `utils` | `packages/utils` |
| `docs` | Documentation only |
| `ci` | CI/CD pipeline |
| `deps` | Dependency updates |
| `repo` | Monorepo-wide changes |

### 1.4 Breaking Changes

Append `!` after the type/scope for breaking changes, or add `BREAKING CHANGE:` footer:

```
feat(api)!: remove hermesGetBuffer from client transport

BREAKING CHANGE: hermesGetBuffer now requires 'server' environment parameter
```

Breaking changes in shared packages (`@hermes/*`) must be documented in a `CHANGELOG.md` at the package root and trigger a major version bump.

---

## 2. Branch Strategy

### 2.1 Branch Naming

```
<type>/<description>

feature/offline-message-queue
fix/gps-coordinate-format
a11y/login-form-labels
chore/update-dependencies
docs/sbitx-deployment-adr
```

### 2.2 Branch Flow

```
main               ← Production branch. Protected. Requires PR + review + CI pass.
  │
  ├── feature/*    ← New features. Branched from main, merged back via PR.
  ├── fix/*        ← Bug fixes. Branched from main, merged back via PR.
  ├── chore/*      ← Tooling/dependency changes.
  └── docs/*       ← Documentation changes.
```

### 2.3 Protected Branch Rules

- `main` requires 1 approving review (2 for shared package changes)
- All CI checks must pass (lint, typecheck, test, build)
- Squash merge only — clean commit history on `main`
- Branch must be up to date with `main` before merging

---

## 3. Pull Request Conventions

### 3.1 PR Title

Must match the conventional commit format — this becomes the squash merge commit message.

### 3.2 PR Description Template

```markdown
## What

[Brief description of the change]

## Why

[Why this change is needed — reference ADR, issue, or audit finding]

## Screenshots / Recordings

[If UI change — before/after screenshots at 800×480 (sBitx viewport)]

## Checklist

- [ ] TypeScript compiles with zero errors (`npm run typecheck`)
- [ ] Lint passes with zero warnings (`npm run lint`)
- [ ] Tests pass (`npm test`) and new code has ≥80% coverage
- [ ] All user-facing strings are in `messages/en.json` and `messages/pt.json`
- [ ] No hardcoded colors/spacing — all values from design tokens
- [ ] Components have JSDoc with @example
- [ ] Interactive elements have `aria-label` or visible `<label>`
- [ ] Tested at 800×480 viewport (sBitx) and ≥1024px (desktop)
- [ ] Tested in both light and dark themes
- [ ] No `any` types (or explicit eslint-disable with justification comment)
- [ ] No `console.log` (use Pino logger or remove before merge)
```

### 3.3 Review Requirements

| Change Type | Min Reviews | Required Reviewers |
|---|---|---|
| Shared package (`@hermes/*`) | 2 | 1 frontend architect + 1 domain owner |
| App code (`apps/*`) | 1 | Any team member |
| Documentation | 1 | Any team member |
| CI/CD | 1 | DevOps reviewer |

### 3.4 Review Checklist for Reviewers

```
## Architecture
- [ ] Component follows the layer convention (presentation / container / page)
- [ ] No prop drilling beyond 2 levels without context
- [ ] Hook follows ServerState<T> pattern if fetching data
- [ ] No raw fetch in component render — always behind a hook
- [ ] Shared code is in packages/, not duplicated across apps

## TypeScript
- [ ] No `any` types (or justified with comment)
- [ ] All props and return types are explicit (not inferred `any`)
- [ ] Uses discriminated unions for variant components

## Accessibility
- [ ] Semantic HTML: buttons are <button>, links are <a>
- [ ] Icon-only buttons have aria-label
- [ ] Focus order is logical
- [ ] Modals trap focus and restore on close
- [ ] Color is not the only differentiator

## Performance
- [ ] No inline object/function/array creation in JSX props
- [ ] Heavy components lazy-loaded (next/dynamic)
- [ ] Images use Next.js <Image>
- [ ] Scroll handlers are passive

## i18n
- [ ] All strings use useTranslations() — no hardcoded text
- [ ] Keys exist in both en.json and pt.json
- [ ] Dates/numbers use Intl APIs

## Security
- [ ] No secrets in client code
- [ ] Input validated before API call
- [ ] No dangerouslySetInnerHTML without sanitization
```

---

## 4. Code Patterns

### 4.1 Component Pattern

Every component must follow this structure:

```typescript
// 1. Imports
//    a) React / Next.js
//    b) External libraries
//    c) Shared packages (@hermes/*)
//    d) Local imports (@/components, @/hooks, @/lib)
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LoadingSpinner } from '@hermes/ui';
import { useChatData } from '@/hooks/useChatData';

// 2. Props interface (exported for reuse in tests/parents)
export interface MyComponentProps {
  /** Description of the prop */
  title: string;
  /** Optional prop with default */
  isLoading?: boolean;
  /** Callback when user interacts */
  onAction: (id: number) => void;
}

// 3. Component function with JSDoc
/**
 * Brief description of the component.
 *
 * @example
 * <MyComponent title="Hello" onAction={(id) => console.log(id)} />
 */
export function MyComponent({ title, isLoading = false, onAction }: MyComponentProps) {
  // 4. Hooks (top of component, in dependency order)
  const t = useTranslations('namespace');
  const [localState, setLocalState] = useState<string>('');

  // 5. Derived values (computed, not stored)
  const displayText = localState || t('fallback');

  // 6. Event handlers
  function handleClick() {
    onAction(42);
  }

  // 7. Conditional rendering (early returns for loading/empty/error)
  if (isLoading) return <LoadingSpinner />;

  // 8. Main render
  return (
    <button onClick={handleClick} aria-label={t('label')}>
      {displayText}
    </button>
  );
}
```

### 4.2 Hook Pattern

Every data-fetching hook must follow the `ServerState<T>` pattern:

```typescript
import { useState, useEffect, useCallback } from 'react';

export interface ServerState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Module-level in-flight request deduplication
const inFlightRequests = new Map<string, Promise<unknown>>();

export function useMyData(param: string): ServerState<MyData> {
  const [data, setData] = useState<MyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = `myData:${param}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Deduplicate concurrent requests
      const existing = inFlightRequests.get(cacheKey);
      if (existing) {
        const cached = await existing;
        setData(cached as MyData);
        return;
      }

      const promise = fetch(`/api/my-resource/${param}`).then((r) => r.json());
      inFlightRequests.set(cacheKey, promise);

      const result = await promise;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      inFlightRequests.delete(cacheKey);
      setLoading(false);
    }
  }, [param, cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
```

### 4.3 API Route Pattern

Every Next.js API route handler must follow this pattern:

```typescript
// apps/hermes-X/src/app/api/resource/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { hermesGet, hermesPost } from '@hermes/api/server'; // Explicit server transport

export async function GET(request: NextRequest) {
  try {
    // 1. Extract auth from incoming request
    const cookie = request.headers.get('cookie') ?? undefined;

    // 2. Call backend via server transport
    const { data, status } = await hermesGet('resource', cookie);

    // 3. Return response
    return NextResponse.json(data, { status });
  } catch (error) {
    // 4. Structured error logging (Pino in production)
    console.error('[GET /api/resource]', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // 1. Validate input before forwarding
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const { field } = body as Record<string, unknown>;
  if (typeof field !== 'string' || !field.trim()) {
    return NextResponse.json({ message: 'Field is required' }, { status: 400 });
  }

  // 2. Forward validated request to backend
  const cookie = request.headers.get('cookie') ?? undefined;
  const { data, status } = await hermesPost('resource', { field }, cookie);

  return NextResponse.json(data, { status });
}
```

### 4.4 Design Token Usage

```typescript
// ❌ NEVER — hardcoded values
<div className="text-[#f97316] mt-[12px] rounded-[16px]">

// ✅ ALWAYS — design tokens via Tailwind theme
<div className="text-orange-500 mt-3 rounded-2xl">
```

Custom tokens are defined in `packages/tailwind-config/base.ts` and consumed via Tailwind classes. No magic numbers or hex values in components.

### 4.5 i18n Usage

```typescript
// ❌ NEVER — hardcoded strings
<p>Welcome to HERMES</p>
<button aria-label="Close dialog">X</button>

// ✅ ALWAYS — useTranslations
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('myNamespace');
  return (
    <>
      <p>{t('welcome')}</p>
      <button aria-label={t('closeDialog')}>
        <XIcon aria-hidden="true" />
      </button>
    </>
  );
}
```

### 4.6 Accessibility Patterns

```typescript
// Icon-only buttons — must have aria-label
<button onClick={handleClose} aria-label={t('close')}>
  <XIcon aria-hidden="true" />
</button>

// Modals — must trap focus and restore on close
// Use <ConfirmDialog> or <PasswordDialog> from @hermes/ui — they handle this internally

// Dynamic content — use aria-live for announcements
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Lists — use semantic elements
<ul role="list"> {/* role="list" needed because Tailwind resets list-style */}
  {items.map((item) => (
    <li key={item.id}>{item.name}</li>
  ))}
</ul>

// Headings — maintain hierarchy, no skipped levels
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Sub-section</h3>
```

---

## 5. Directory Structure Conventions

### 5.1 App Directory (`apps/<app>/src/`)

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (providers only)
│   ├── page.tsx                  # Home page
│   ├── globals.css               # Global styles (minimal)
│   ├── login/
│   │   └── page.tsx
│   ├── chat/
│   │   └── [station]/
│   │       └── page.tsx
│   └── api/                      # API route handlers (proxy to backend)
│       └── resource/
│           └── route.ts
│
├── components/                   # App-specific components
│   ├── chat/                     # Feature-specific subdirectories
│   │   ├── MessageBubble.tsx
│   │   ├── MessageList.tsx
│   │   └── MessageInput.tsx
│   └── home/
│       └── ConversationItem.tsx
│
├── hooks/                        # App-specific hooks
│   ├── useChatData.ts
│   └── useSendMessage.ts
│
├── lib/                          # Pure functions (no React dependency)
│   ├── formatting.ts
│   └── validation.ts
│
└── providers/                    # App-level providers (if not from shared packages)
    └── ...
```

### 5.2 Package Directory (`packages/<name>/src/`)

```
packages/shared-auth/src/
├── index.ts                      # Public API barrel export
├── auth/
│   ├── AuthProvider.tsx
│   ├── useAuth.ts
│   ├── useAuthGuard.ts
│   └── tokenStore.ts
├── websocket/
│   ├── WebSocketProvider.tsx
│   ├── useWebSocket.ts
│   └── events.ts               # Event type definitions
├── locale/
│   └── LocaleProvider.tsx
└── testing/                      # Shared test utilities (NOT exported from index.ts)
    ├── mocks/
    │   ├── mockAuthProvider.tsx
    │   ├── mockWebSocket.ts
    │   └── mockApi.ts
    └── fixtures/
        ├── messages.ts
        └── users.ts
```

### 5.3 Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Components | PascalCase, one per file | `MessageBubble.tsx` |
| Hooks | camelCase, `use` prefix | `useChatData.ts` |
| Pure functions | camelCase | `formatTime.ts` |
| Types/interfaces | PascalCase | `Message.ts` |
| API routes | `route.ts` (Next.js convention) | `api/messages/route.ts` |
| Test files | `<name>.test.ts` co-located or in `__tests__/` | `useChatData.test.ts` |
| i18n files | Locale code: `en.json`, `pt.json` | `messages/en.json` |

---

## 6. TypeScript Standards

### 6.1 Strict Mode

`tsconfig.json` must extend `packages/config/typescript/base.json` with:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 6.2 Forbidden Patterns

```typescript
// ❌ any — use unknown, generic, or proper type
const data: any = await response.json();

// ✅ Proper typing
const data: Message[] = await response.json();

// ❌ Type assertions (as) unless absolutely necessary
const user = data as HermesUser;

// ✅ Type guards
if (isHermesUser(data)) {
  const user: HermesUser = data;
}

// ❌ Non-null assertions (!)
const name = user!.name;

// ✅ Optional chaining + null check
const name = user?.name ?? t('unknownUser');
```

### 6.3 Discriminated Unions for Variants

```typescript
// ✅ Use discriminated unions for components with variants
type MessageBubbleProps = {
  msg: Message;
  variant: 'inbound' | 'outbound';
} & ({
  variant: 'inbound';
  // inbound-specific props
} | {
  variant: 'outbound';
  // outbound-specific props
  onDelete: (id: number) => void;
});

// NOT multiple optional props dependent on a 'type' field
```

---

## 7. Testing Standards

### 7.1 Test File Location

```
src/
├── hooks/
│   ├── useChatData.ts
│   └── useChatData.test.ts         # Co-located with source
├── lib/
│   ├── formatting.ts
│   └── formatting.test.ts
└── components/
    └── chat/
        ├── MessageBubble.tsx
        └── __tests__/
            └── MessageBubble.test.tsx   # Or __tests__ subdirectory
```

### 7.2 Test Coverage Targets

| Module Type | Coverage Target |
|---|---|
| Pure utility functions (`lib/`) | 100% (all branches) |
| Hooks (`hooks/`) | 100% (all states: loading, data, error, edge cases) |
| Shared components (`@hermes/ui`) | 100% (render + interactions + accessibility) |
| App components (`apps/*/components/`) | ≥80% |
| API route handlers | 100% (happy path + error paths) |
| End-to-end flows | Critical paths only (login, send message, view GPS) |

### 7.3 Test Structure

```typescript
// useChatData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('useChatData', () => {
  describe('when API responds successfully', () => {
    it('returns messages from the merged inbox + sent response', async () => {
      // Arrange, Act, Assert
    });

    it('deduplicates messages by ID', async () => { /* ... */ });

    it('sets inbox flag based on orig matching station identity', async () => { /* ... */ });
  });

  describe('when API fails', () => {
    it('sets error state with translated message', async () => { /* ... */ });

    it('keeps previous data on refresh failure', async () => { /* ... */ });
  });

  describe('when WebSocket receives message.new', () => {
    it('appends the new message to the list', async () => { /* ... */ });
  });

  describe('cleanup', () => {
    it('unsubscribes from WebSocket on unmount', async () => { /* ... */ });
  });
});
```

---

## 8. ESLint Configuration

### 8.1 Required Rules

```javascript
// packages/config/eslint/next.mjs
export default {
  extends: ['next/core-web-vitals', 'next/typescript'],
  rules: {
    // Forbidden patterns
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    'no-console': 'error',                          // Use Pino logger
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['process.env'],
        message: 'Use config from @hermes/shared-auth, not process.env directly',
      }],
    }],

    // Accessibility
    'jsx-a11y/alt-text': 'error',
    'jsx-a11y/anchor-has-content': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-role': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',
    'jsx-a11y/no-static-element-interactions': 'warn',

    // Performance
    'react/jsx-no-constructed-context-values': 'error', // Prevent inline objects in Context
    'react/no-unstable-nested-components': 'error',

    // i18n
    'no-restricted-syntax': ['error', {
      selector: "JSXText[value=/[a-zA-Z]{3,}/]",
      message: 'Hardcoded text detected. Use useTranslations() instead.',
    }],
  },
};
```

---

## 9. Dependency Management

### 9.1 Adding Dependencies

- App dependencies: add to the specific `apps/<name>/package.json`
- Shared dependencies: add to `packages/<name>/package.json` as `dependencies` (if required at runtime) or `peerDependencies` (if provided by the consuming app, e.g., `react`, `next`)
- Root dev dependencies (turbo, eslint, prettier): add to root `package.json`

### 9.2 Version Pinning

- Application dependencies: `^x.y.z` (minor/patch auto-updates)
- Internal packages (`@hermes/*`): `*` (workspace protocol — always use local version)
- Exact pins (`x.y.z`) only for known-buggy packages

### 9.3 Bundle Size Budget

Add to each app's `next.config.ts`:

```typescript
export default {
  experimental: {
    turbo: {
      rules: {
        '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
      },
    },
  },
  // Bundle size budget
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.performance = {
        maxAssetSize: 200_000,    // 200KB per asset
        maxEntrypointSize: 500_000, // 500KB per entry point
      };
    }
    return config;
  },
};
```

---

## 10. Changelog & Versioning

### 10.1 Shared Packages

Each shared package (`@hermes/api`, `@hermes/ui`, `@hermes/shared-auth`, `@hermes/tailwind-config`) must maintain a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/).

### 10.2 Version Bumps

- **Major**: Breaking API changes, removed exports, changed component props
- **Minor**: New features, new exports (backward compatible)
- **Patch**: Bug fixes, performance improvements, dependency updates

### 10.3 App Versioning

Apps (`hermes-shell`, `hermes-gps-final`, `hermes-chat-final`) use the git commit hash as their version identifier, embedded at build time:

```typescript
// next.config.ts
env: {
  NEXT_PUBLIC_APP_VERSION: process.env.GIT_COMMIT_HASH ?? 'dev',
  NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
},
```

---

## 11. Anti-Patterns: Do Not Carry Forward from PoC

The following patterns exist in the PoC (`apps/hermes-chat`, `apps/hermes-gps`) and are **explicitly forbidden** in the final codebase:

| PoC Anti-Pattern | Location | Correct Pattern |
|---|---|---|
| `any` types with eslint-disable | `useScrollPager.ts` line 13 | Proper generics: `TMessage[]` |
| Raw `fetch` in component render | `page.tsx` lines 27–31 | `useAuth` hook encapsulates fetch |
| `localStorage` for auth in production | `useAuthGuard.ts` | HttpOnly cookie in production |
| Inline error `<p>` instead of `ErrorBanner` | Various components | Always use `ErrorBanner` from `@hermes/ui` |
| `dangerouslySetInnerHTML` for theme script | `layout.tsx` line 31 | Acceptable ONLY for the theme flash prevention script (one-time, CSP-compatible) |
| Google Fonts CDN (`next/font/google`) | `layout.tsx` lines 7–15 | Self-hosted fonts in `/public/fonts/` |
| `unread: msgs.filter(m => m.inbox).length` | `conversation.ts` line 72 | Server-provided `unreadCount` field |
| No i18n on error messages | Various `throw new Error(...)` | All user-facing errors through `useTranslations()` |
| Capacitor as primary mobile strategy | `capacitor.config.ts` | PWA with Service Worker + manifest |
| Inconsistent response envelope | API routes return raw data | Consistent `{ data, message? }` envelope |

---

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Frontend Architect Agent](/.claude/agents/frontend-arch.agent.md)
- [ADR-003: Authentication Strategy](/docs/adr/ADR-003-auth-strategy.md)
- [ADR-006: State Management](/docs/adr/ADR-006-state-management.md)