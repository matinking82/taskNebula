---
description: Run the complete TaskNebula local verification gate
allowed-tools: Bash(pnpm --filter @tasknebula/mcp-server build:*), Bash(pnpm i18n:check:*), Bash(pnpm hygiene:check:*), Bash(pnpm ui:check:*), Bash(pnpm docs:check:*), Bash(pnpm type-check:*), Bash(pnpm lint:*), Bash(pnpm test:*), Bash(pnpm --filter @tasknebula/web openapi:check:*), Bash(git diff --check:*)
---

Run every gate from the repository root and report each result independently:

1. `pnpm --filter @tasknebula/mcp-server build`
2. `pnpm i18n:check`
3. `pnpm hygiene:check`
4. `pnpm ui:check`
5. `pnpm docs:check`
6. `pnpm type-check`
7. `pnpm lint`
8. `pnpm test`
9. `pnpm --filter @tasknebula/web openapi:check`
10. `git diff --check`

Do not hide a later result because an earlier gate failed. Do not modify files
unless the user separately asked for fixes.
