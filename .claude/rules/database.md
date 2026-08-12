---
paths:
  - 'packages/db/**/*.ts'
  - 'packages/db/**/*.sql'
  - 'packages/db/drizzle/meta/_journal.json'
---

# Database rules (packages/db)

- **ORM**: Drizzle ORM + `postgres` client, PostgreSQL with pgvector. Schema in `src/schema/` (re-exported from `index.ts`).
- **Migrations are hand-written SQL** (snapshots are frozen at `0012`; the misleading `db:generate` scripts were removed). Workflow: edit schema TS → hand-write an **idempotent** SQL file in `drizzle/` (`IF NOT EXISTS` / `duplicate_object` guards) → append a `drizzle/meta/_journal.json` entry whose `when` is **strictly greater** than the previous entry's → `pnpm db:migrate`. Use a recent idempotent migration as the template.
- **Multi-tenancy is mandatory**: every tenant-scoped table has an `organization_id` column, and **application queries must filter by `organization_id`** — that app-level filtering is the _only_ isolation layer. Postgres **RLS is planned (roadmap #37) but NOT implemented** — never claim RLS exists or rely on a DB-level backstop.
- **Keys & data**: primary keys are CUID2 (`@paralleldrive/cuid2`); flexible attributes go in JSONB columns.
- **Indexes**: index `organization_id`, `project_id`, `user_id`, and other frequently queried columns.
- **Destructive changes** (drop/rename/type-narrow): call them out explicitly and provide a safe migration path; never silently lose data.
- pgvector tuning guidance: `packages/db/docs/PGVECTOR_TUNING.md`.
