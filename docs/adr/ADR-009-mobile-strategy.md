# ADR-009: Mobile / Companion Device Strategy

**Status**: Accepted  
**Date**: 2026-08-06  
**Deciders**: Frontend Architect, Senior Project Manager

---

## Context

The Hermes frontend has multiple deployment targets. Clarifying the mobile strategy requires understanding what the sBitx is and how mobile devices relate to it:

| Target | Hardware | Role | Screen | Network |
|---|---|---|---|---|
| **sBitx** (primary) | Raspberry Pi 4, ARM64 | The radio station itself — runs all services, has the HF transceiver attached | 7-inch, 800×480 touchscreen (Chromium kiosk) | None (air-gapped). All services on `localhost`. |
| **Companion tablet/phone** | Android/iOS device | Secondary display — connects to sBitx over LAN for a larger screen or remote operation | Variable (typically 7–10 inch tablet) | LAN (Wi-Fi) — must be on same network as sBitx |

The question: **how should a companion mobile device access the Hermes UI?**

The PoC (`apps/hermes-chat/capacitor.config.ts`) uses Capacitor in "remote server" mode — a thin native WebView wrapper that loads the Next.js app from `http://localhost:3000`. This approach has significant limitations and is not appropriate for the companion use case.

## Decision

**We will use a Progressive Web App (PWA) strategy for companion devices, NOT Capacitor native apps.**

### Rationale

| Factor | PWA | Capacitor Native App |
|---|---|---|
| **Offline value** | Minimal — if sBitx is unreachable, there's no radio to communicate with. PWA caches app shell for fast loading, but real functionality requires the server. | Same limitation — native app can't communicate without the sBitx server. Building offline doesn't add value. |
| **Deployment** | User visits `http://sbitx-ip` in browser → "Add to Home Screen" → app-like icon. No Play Store, no APK. | Must build APK/AAB, sign, distribute. Play Store requires listing and review. |
| **Updates** | Deployed with the sBitx server. User always gets the latest version on page load. | Must rebuild and redistribute APK on every update. |
| **Native features** | Limited (Service Worker cache, `manifest.json` for install). | Full native API access (camera, files, push). But Hermes doesn't need these for companion use. |
| **Maintenance** | Same codebase as sBitx web app. One build serves both. | Separate Capacitor config, native project files, build pipeline. |
| **Cross-platform** | Works on any modern browser (Android Chrome, iOS Safari, desktop). | Requires separate Android + iOS builds. |
| **Offline app shell** | Service Worker caches HTML/JS/CSS. App loads instantly even with spotty Wi-Fi. | Can bundle assets in APK, but still needs server for data. |

### How It Works

```
┌──────────────────────────────────────────────────────────────────┐
│                  sBitx (Raspberry Pi)                             │
│                                                                   │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ nginx        │  │ backend  │  │ daemon   │  │ PostgreSQL  │  │
│  │ :80          │  │ :8080    │  │ :8081    │  │ :5432       │  │
│  │              │  │          │  │          │  │             │  │
│  │ Serves:      │  │ REST API │  │ WebSocket│  │             │  │
│  │ • / (shell)  │  │          │  │          │  │             │  │
│  │ • /gps       │  │          │  │          │  │             │  │
│  │ • /chat      │  │          │  │          │  │             │  │
│  │ • /api/*     │  │          │  │          │  │             │  │
│  │ • manifest   │  │          │  │          │  │             │  │
│  │ • sw.js      │  │          │  │          │  │             │  │
│  └──────┬───────┘  └──────────┘  └──────────┘  └─────────────┘  │
│         │                                                         │
│         │ Wi-Fi / LAN                                             │
│         │                                                         │
└─────────┼─────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┐
    │           │
┌───┴───┐  ┌───┴───┐
│Tablet │  │ Phone │
│       │  │       │
│ Opens │  │ Opens │
│ http://│  │http://│
│sbitx-ip│  │sbitx-ip│
│       │  │       │
│ + Adds to   │
│ Home Screen │
│ (PWA icon)   │
└─────────────┘  └─────────────┘
```

### Implementation

#### 1. Service Worker (App Shell Cache)

Each app registers a minimal Service Worker that caches the app shell:

```typescript
// apps/hermes-shell/public/sw.js
const CACHE_NAME = 'hermes-shell-v1';
const SHELL_FILES = [
  '/',
  '/login',
  '/_next/static/...',  // Hashed JS/CSS bundles
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first for shell, network-first for API
  if (event.request.url.includes('/api/')) {
    return; // Never cache API responses
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

#### 2. Web App Manifest (Installable)

```json
// apps/hermes-shell/public/manifest.json
{
  "name": "HERMES",
  "short_name": "HERMES",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### 3. `layout.tsx` Manifest Link

```tsx
// Every app's layout.tsx
export const metadata: Metadata = {
  manifest: '/manifest.json',
  // ...
};
```

#### 4. Responsive Design (sBitx-First, Scales Up)

The UI is designed for the sBitx's 800×480 touchscreen first (ADR-008). This same touch-first design works perfectly on tablets and phones — they just have more screen real estate. Breakpoints scale up:

```css
/* Base: sBitx 800×480 (no media query — default) */
/* sm (640px) — larger phones */
/* md (768px) — small tablets in portrait */
/* lg (1024px) — tablets in landscape, desktops */
```

### What Happens to the Existing Capacitor Config?

The PoC `capacitor.config.ts` is **removed** from the final apps. Capacitor dependencies (`@capacitor/cli`, `@capacitor/core`, `@capacitor/android`) are removed from `package.json`. The `capacitor-web/` fallback directory is deleted.

If a future requirement emerges for true native features (push notifications, background GPS tracking, native file system access), Capacitor can be re-added. But for the current companion device use case, it adds complexity without value.

## Consequences

### Positive
- Single codebase serves sBitx (kiosk) AND companion devices (PWA) — no native build pipeline
- Updates deploy once (on the sBitx server) and all companion devices get them immediately
- "Add to Home Screen" gives app-like experience without Play Store
- Service Worker provides instant loading (from cache) even on spotty LAN
- No native app signing, distribution, or update headaches
- Works on any modern browser — Android, iOS, desktop — no platform-specific code

### Negative
- No access to native APIs (camera for photo attachments, file system for downloads) — but these work fine in the browser via `<input type="file">` and `<a download>`
- iOS Safari has historically limited PWA support (improving in iOS 17+) — but the app still works as a regular web page
- Service Worker cache invalidation requires careful versioning — stale shell could cause issues
- No push notifications (but sBitx is air-gapped — where would push notifications come from?)
- No background GPS tracking on mobile (but GPS comes from the sBitx's attached GPS receiver, not the mobile device)

### Mitigations
- Service Worker version is tied to the app build hash — every deploy produces a new cache key
- `manifest.json` `start_url` uses root path — always loads the latest version
- iOS users can still use the app as a regular web page if PWA install is restricted
- File uploads use `<input type="file" accept="image/*,audio/*">` — works in all browsers, no native API needed

## Alternatives Considered

| Alternative | Rejected Because |
|---|---|
| **Capacitor native app** (current PoC approach) | Adds build pipeline complexity. Requires APK redistribution on every update. No offline value — mobile always needs sBitx server reachable. |
| **Capacitor with bundled assets** (full offline) | Even more complex. Serves no purpose — without the sBitx server, there's no radio to communicate with. Mobile offline is a non-goal. |
| **React Native** | Separate codebase in a different framework. Duplicates all UI components. Team expertise is React/Next.js. |
| **PWA only, no service worker** | Loses installability and fast loading. Service Worker is the key feature that makes PWA worthwhile. |
| **Desktop-only (no mobile consideration)** | Companion tablets/phones are a real use case — operators want a larger screen away from the radio. Responsive design costs little extra (it's the same codebase). |

## References

- PoC Capacitor config: `apps/hermes-chat/capacitor.config.ts`
- PoC Capacitor fallback: `apps/hermes-chat/capacitor-web/index.html`
- sBitx deployment: `docs/adr/ADR-008-sbitx-deployment.md`
- Multi-app deployment: `docs/adr/ADR-007-multi-app-deployment.md`
- Web App Manifest: `https://developer.mozilla.org/en-US/docs/Web/Manifest`
- Service Worker API: `https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API`