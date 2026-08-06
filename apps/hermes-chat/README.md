# Hermes Chat

A [Next.js 15](https://nextjs.org) application inside a **monorepo** managed with [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) and [Turborepo](https://turbo.build).

---

## Monorepo structure

```
hermes-chat/          ← root (orchestration only)
├── apps/
│   └── hermes-chat/  ← this Next.js app
└── packages/
    ├── ui/           ← @platform/ui    (shared React components)
    ├── utils/        ← @platform/utils (shared utilities & types)
    └── config/       ← shared ESLint, Tailwind, TypeScript configs
```

Packages are linked locally via workspaces, so `@platform/ui` and `@platform/utils` are available as regular imports without publishing to npm.

---

## Requirements

- Node.js >= 20
- npm >= 11

---

## Getting started

Install all dependencies from the **root** of the repository:

```bash
npm install
```

---

## Development

Run **all** apps and packages in watch mode simultaneously from the root:

```bash
npm run dev
```

Run **only this app**:

```bash
npx turbo run dev --filter=hermes-chat
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The page hot-reloads as you edit files. Turbopack is enabled by default for faster builds during development.

---

## Building

Build **everything** (shared packages first, then this app) from the root:

```bash
npm run build
```

Turborepo respects the dependency graph — `@platform/ui` and `@platform/utils` are always built before `hermes-chat`.

Build **only this app** (and its local dependencies):

```bash
npx turbo run build --filter=hermes-chat
```

Build a **specific package** in isolation:

```bash
npx turbo run build --filter=@platform/ui
```

---

## Running in production

After a successful build, start the Next.js production server from inside this app's folder:

```bash
cd apps/hermes-chat
npm run start
```

Or directly:

```bash
node apps/hermes-chat/.next/standalone/server.js
```

---

## Other scripts

| Command | Description |
|---|---|
| `npm run lint` | Lint all packages |
| `npm run test` | Run tests across all packages |
| `npx turbo run <script> --filter=<name>` | Run any script in a specific workspace |

---

## Internationalisation

UI strings live in `messages/` and are loaded via [next-intl](https://next-intl.dev):

- `messages/en.json` — English
- `messages/pt.json` — Portuguese

---

## Learn more

- [Next.js documentation](https://nextjs.org/docs)
- [Turborepo documentation](https://turbo.build/repo/docs)
- [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces)
