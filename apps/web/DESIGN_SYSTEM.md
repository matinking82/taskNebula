# TaskNebula Design System

**Verified:** 2026-08-12

This is the implementation contract for TaskNebula's web UI. Read
[`DESIGN.md`](DESIGN.md) first: it owns product intent, page archetypes, flow
evidence, and acceptance. This document owns reusable visual and interaction
decisions.

The authority chain is:

```text
DESIGN.md (intent and evidence)
  -> DESIGN_SYSTEM.md (token and component contract)
    -> src/app/globals.css + tailwind.config.ts (token implementation)
      -> src/components/ui (reusable mechanics)
        -> domain components and routes
```

If code and this contract disagree, verify the intended behavior and repair
both in the same change. Neither a stale document nor an incidental CSS value
wins silently.

## Core language

TaskNebula Workbench is square-ish, calm, dense, and architectural.

- Typography and spacing establish hierarchy before color or shadow.
- One primary blue communicates action. Semantic color communicates real
  state, priority, risk, or category.
- Navigation recedes; work, ownership, provenance, and the next handoff lead.
- Use fewer surfaces and borders. Avoid nested generic cards.
- Dark mode and keyboard behavior are first-class.
- Gradients, glass, dot grids, glows, and ornamental icon tiles are not product
  decoration. A public hero may earn a restrained exception through
  `DESIGN.md` evidence.

### Workbench shell

- The global rail is the darkest and quietest layer. It uses icon-only
  destinations with accessible names; tiny multi-line labels are not navigation.
- The context panel uses neutral surfaces and readable local labels. Its active
  row is expressed with position, contrast, and a restrained action accent—not
  a large saturated tile.
- The desktop work canvas is an accountable inset surface with one perimeter,
  one command bar, and one content grid. It becomes edge-to-edge below the
  desktop breakpoint.
- Page headers and view toolbars align with the primary data surface. Avoid a
  page header floating at one width above a table or board at another width.
- Global search, create, and quick actions live in the command bar. Route-local
  filters and view controls live beside the data they affect.

## Tokens

Use semantic Tailwind tokens; do not add arbitrary hex values when a token
exists.

| Intent                     | Preferred tokens                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Page and elevated surface  | `bg-background`, `bg-card`, `bg-surface`, `bg-surface-2`                                       |
| Primary and secondary text | `text-foreground`, `text-muted-foreground`                                                     |
| Action                     | `bg-primary`, `text-primary`, `text-primary-foreground`                                        |
| Neutral interaction        | `bg-muted`, `bg-accent`                                                                        |
| Status                     | `success`, `warning`, `destructive`, `info` token families                                     |
| Category                   | `accent-blue`, `accent-violet`, `accent-cyan`, `accent-emerald`, `accent-amber`, `accent-rose` |
| Edge and focus             | `border-border`, `border-border-strong`, `ring-ring`                                           |

Accent hues are semantic and sparse. They do not create a rainbow navigation
or a grid of interchangeable colored cards.

### Radius

The values are implemented by CSS variables and Tailwind:

| Token          |    Value | Use                                          |
| -------------- | -------: | -------------------------------------------- |
| `rounded-sm`   |      2px | compact tags, status chips, small metadata   |
| `rounded-md`   |      4px | buttons, inputs, menus, interactive defaults |
| `rounded-lg`   |      6px | cards, dialogs, substantial panels           |
| `rounded-xl`   |     10px | exceptional public/hero surface only         |
| `rounded-full` | circular | avatars, dots, genuinely circular controls   |

Do not use `rounded-full` to turn every label into a pill. Do not introduce
`rounded-xl` or `rounded-2xl` on ordinary product cards.

### Elevation

- Resting product surfaces usually need no shadow or `shadow-xs`.
- Menus/popovers use `shadow-sm`; dialogs may use `shadow-lg`.
- Hover must not make content jump. Prefer border/color response over large
  lift or scale effects.
- Glow shadows are reserved for an explicitly approved public emphasis, not
  authenticated product state.

## Motion

Motion explains state, location, or response; it is not a finish layer.

- Interactive feedback: 150–200ms.
- Animate named properties (`transition-colors`, `transition-opacity`,
  `transition-transform`). Product UI does not use `transition-all`.
- An entrance may run up to 400ms only when it clarifies location or a major
  state change. Existing 500ms+ entrance utilities are legacy, not defaults.
- Ambient animation is reserved for real live/pending state and must not
  compete with the work.
- Never hide required information until an animation completes.
- Every motion path must remain usable with `prefers-reduced-motion`.

Use existing easing/timing tokens. Add a new keyframe only when a reusable,
evidence-backed behavior cannot be expressed with current primitives.

## Composition primitives

### Buttons and controls

Use the primitives in `src/components/ui` before writing custom markup.

- Primary: `Button` default variant.
- Secondary: `outline`.
- Tertiary: `ghost`.
- Destructive: `destructive` with explicit confirmation/recovery where needed.
- Keep a stable label or accessible name during pending state; disable duplicate
  submission and show completion or actionable failure.

### Cards and panels

- A card groups one coherent decision or object. It is not the default wrapper
  for every section.
- Prefer one outer surface plus spacing or `surface-inset` to card-in-card
  nesting.
- `surface-card`, `surface-inset`, and `row-interactive` are implementation
  helpers, not permission to make every page a card grid.
- The existing user-selectable glass appearance is legacy compatibility. New
  components must remain legible without relying on blur and should not add
  new glass-only treatment.
- Workbench surfaces use quiet tonal separation: page canvas, primary data
  surface, then inset/selected state. Do not give every widget its own shadow.
- Dense cards and rows show identity and state first. Optional metadata yields
  before titles truncate or action targets become too small.

### Badges and status

A badge is earned by status or compact metadata. Use a status dot plus concise
text when that is clearer. Never encode state by color alone.

### Typography and numbers

- Use size and weight before color for hierarchy.
- IBM Plex Sans/Mono remains the authenticated-workbench signature. Base UI
  text is 14/20; 12/16 is reserved for metadata and navigation support.
- Identifiers and machine evidence may use the mono family; prose does not.
- Comparisons, metrics, times, and aligned counts use `tabular-nums`.
- Long-form text keeps a readable measure.

### Focus and accessibility

- Reuse Radix/shadcn focus behavior. Custom controls need a visible
  `focus-visible` ring and semantic element/role.
- Focus returns after a dialog closes and moves to the failing field after
  validation when appropriate.
- Hover-only actions also appear on focus and remain available to touch.
- Check 320px and 390px widths plus at least one RTL locale for layout changes.

## Page-specific modifiers

`.dashboard-carbon` is an existing dashboard-scoped density/visual modifier.
It may square surfaces and tune typography inside that route; it is not a
second global design system and must not leak into other archetypes. It still
obeys semantic color, focus, i18n, responsive, and evidence requirements.

## Internationalization

All new user-facing text, accessible names, placeholders, toasts, and errors
use `next-intl`. Examples in documentation describe structure rather than
copy-pastable English JSX. Add each key with a real translation to all 30
catalogs, preserve ICU placeholders, and run `pnpm i18n:check`.

Static lint catches only part of this rule; review configuration objects and
props manually.

## Replacement guide

| Avoid                                | Use                                           |
| ------------------------------------ | --------------------------------------------- |
| arbitrary gray/hex utilities         | semantic surface/text tokens                  |
| heavy nested shadows and borders     | spacing plus one accountable surface          |
| generic `transition-all`             | property-specific transition                  |
| `rounded-xl/2xl` generic cards       | `rounded-lg`                                  |
| non-circular `rounded-full` controls | `rounded-md` or `rounded-sm`                  |
| decorative gradient/glass/icon tile  | hierarchy or real work topology               |
| mixed icon sizes in one row          | one consistent Lucide size                    |
| simulated success                    | persisted success or explicit retry/recovery  |
| hardcoded visible copy               | `next-intl` key in all catalogs               |
| icon rail with 9px wrapped labels    | icon destination + tooltip/accessibility name |
| duplicated global and local action   | one scoped command/action surface             |
| desktop drawer squeezed onto mobile  | full-screen mobile detail                     |

## Change and verification

Token changes belong in the shared implementation and must update this
contract when they alter behavior. Route-specific preferences stay local.

Run from the repository root:

```bash
pnpm ui:check
pnpm i18n:check
pnpm --filter @tasknebula/web type-check
pnpm --filter @tasknebula/web lint
pnpm --filter @tasknebula/web test
```

For visible changes, also exercise the real route with keyboard and pointer in
light/dark, mobile/desktop, relevant loading/error states, and RTL when layout
can change. Follow the maker/checker evidence loop in `DESIGN.md`.
