# packages/mcp-server — @tasknebula/mcp-server

Model Context Protocol server exposing TaskNebula to Claude/Cursor/etc. over the web app's REST API.
Root guide: `/CLAUDE.md`. Transports: stdio (`src/stdio.ts`) and HTTP (`src/http.ts`).

## Commands (run in packages/mcp-server)

```bash
pnpm build        # tsc -p tsconfig.build.json
pnpm start        # node ./bin/tasknebula-mcp.mjs (stdio)
pnpm test         # Jest
pnpm type-check && pnpm lint
```

## Surface

11 tools in `src/tools/`: create-issue, create-subtask, get-issue, update-issue, assign-issue,
add-comment, transition-status, search-issues, list-projects, list-my-assigned,
get-my-workload. Plus resources (`src/resources.ts`) and prompts (`src/prompts.ts`), registered in
`src/server.ts`. REST calls go through `src/client.ts`; auth resolution in `src/auth.ts`
(`TASKNEBULA_API_URL` + `TASKNEBULA_API_KEY` env).

## Current limitations (verified August 2026)

- **Auth caveat — tools 401 until fixed**: the web REST API does not yet accept API keys (no route
  consumes the `api_keys` table; everything uses session cookies via `await auth()`). Every tool call
  fails with 401 until an API-key resolver lands in `apps/web` route auth. Don't "fix" this inside the
  MCP package — the gap is server-side.
- **Not published to npm**: use the source build instructions in `README.md`;
  publication is gated on end-to-end auth and install smoke tests.
- Real API keys are prefixed `sk_live_`; verify every tool change against the
  authoritative route validation in `apps/web/src/app/api`.
