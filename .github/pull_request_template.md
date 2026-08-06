## What

<!-- Brief description of the change -->

## Why

<!-- Why this change is needed — reference ADR, issue, or audit finding -->

## Screenshots / Recordings

<!-- If UI change — before/after screenshots at 800×480 (sBitx viewport) -->

## Checklist

- [ ] TypeScript compiles with zero errors (`npm run typecheck`)
- [ ] Lint passes with zero warnings (`npm run lint`)
- [ ] Tests pass (`npm test`) and new code has ≥80% coverage
- [ ] All user-facing strings are in `messages/en.json` and `messages/pt.json`
- [ ] No hardcoded colors/spacing — all values from design tokens
- [ ] Components have JSDoc with `@example`
- [ ] Interactive elements have `aria-label` or visible `<label>`
- [ ] Tested at 800×480 viewport (sBitx) and ≥1024px (desktop)
- [ ] Tested in both light and dark themes
- [ ] No `any` types (or explicit eslint-disable with justification comment)
- [ ] No `console.log` (use Pino logger or remove before merge)
- [ ] No `dangerouslySetInnerHTML` (except theme flash prevention script)

## Affected Documents

<!-- Check all that apply -->
- [ ] ADRs (`docs/adr/`)
- [ ] Task lists (`docs/tasks/`)
- [ ] Architecture docs (`docs/architecture/`)
- [ ] Engineering standards (`docs/governance/`)
- [ ] Packages (`packages/`)
- [ ] Apps (`apps/`)

## CI Status

<!-- To be filled by CI automation -->
- [ ] Lint: PENDING
- [ ] TypeScript: PENDING
- [ ] Unit Tests: PENDING
- [ ] Build: PENDING
- [ ] E2E: PENDING
- [ ] Bundle Size: PENDING