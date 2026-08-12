---
paths:
  - 'apps/web/src/**/*.tsx'
  - 'apps/web/src/**/*.ts'
  - 'apps/web/src/**/*.css'
---

# Frontend rules (apps/web)

- **Framework**: Next.js 15 App Router + React 19. Prefer Server Components; add `"use client"` only when you need interactivity/hooks.
- **Imports**: use path aliases `@/*`, `@/components/*`, `@/lib/*`, `@/app/*` — not long relative chains.
- **State**: TanStack Query for server state, Zustand for UI state, React Hook Form + Zod for forms. Don't fetch in `useEffect` when Query fits.
- **UI primitives**: build on `src/components/ui/` (shadcn/Radix) + `class-variance-authority`. Reuse before creating new primitives.
- **Design**: read `apps/web/DESIGN.md` for archetype/decision/evidence, then `DESIGN_SYSTEM.md` for implementation. Radii are `rounded-sm`(2px)/`rounded-md`(4px)/`rounded-lg`(6px); interactive motion is normally 150–200ms and property-specific (no new `transition-all`); use semantic tokens and verify dark mode.
- **i18n (MANDATORY — zero new hardcoded strings)**: EVERY user-facing string MUST go through `next-intl`. This includes JSX text **and** string props (`placeholder`, `aria-label`, `title`, `alt`, `label`, `description`, `tooltip`, `confirmText`, …), `toast`/sonner messages, and user-facing errors. Add each key with a real translation to ALL 30 locale catalogs and preserve ICU placeholders (`node scripts/i18n-check.mjs`). The app uses browser detection + cookie persistence; `ar`/`he` are RTL. ESLint and `ui:check` enforce only a subset of this policy, so code review must inspect props and non-JSX call sites too. Existing legacy exemptions are migration debt, not permission for new literals.
- **Types**: no new `any`; avoid introducing `exactOptionalPropertyTypes` violations.
