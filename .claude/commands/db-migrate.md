---
description: Create and verify the next hand-written TaskNebula database migration
argument-hint: '<schema change>'
allowed-tools: Read, Edit, Grep, Glob, Bash(pnpm db:migrate:*), Bash(pnpm --filter @tasknebula/db type-check:*)
---

Read `packages/db/CLAUDE.md` first and implement: $ARGUMENTS

Use the repository migration convention: schema TypeScript plus the next
idempotent `packages/db/drizzle/NNNN_name.sql` file and a strictly increasing
`packages/db/drizzle/meta/_journal.json` entry. Never run `db:generate` or
`drizzle-kit generate`; snapshots after `0012` do not represent this schema.

Review tenant ownership, indexes, constraints, re-run safety, and rollback.
RLS is not implemented, so do not create a false RLS assumption. Stop before
applying a destructive change or touching a persistent database unless the
user explicitly authorized that action.
