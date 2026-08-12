# `@tasknebula/mcp-server`

Model Context Protocol server for TaskNebula, implemented in this monorepo.

## Current status

- Source package with stdio and HTTP scaffolding.
- Twelve issue/project-oriented tools plus resources and prompts.
- Not published to npm; `npx @tasknebula/mcp-server` does not work yet.
- End-to-end calls are blocked until the web REST API accepts scoped API keys
  (or OAuth) instead of requiring only a browser session cookie.
- HTTP OAuth 2.1/PKCE and resumable Streamable HTTP are incomplete.

This package is useful for contract development and local tests. Do not present
it as a turnkey public connector until the auth, transport, publication, and
install smoke gates in `docs/ROADMAP_2026.md` are closed.

## Develop from the monorepo

```bash
pnpm install --frozen-lockfile
pnpm --filter @tasknebula/mcp-server build
pnpm --filter @tasknebula/mcp-server test
pnpm --filter @tasknebula/mcp-server type-check
pnpm --filter @tasknebula/mcp-server lint
```

Run the built stdio entry point:

```bash
TASKNEBULA_API_URL=http://localhost:3000 \
TASKNEBULA_API_KEY=sk_live_replace_me \
node packages/mcp-server/bin/tasknebula-mcp.mjs
```

The key format shown is syntactically representative only. Until web route
authentication is completed, a key stored by TaskNebula will not make the
cookie-authenticated REST routes succeed.

For an MCP client during local development, point `command` to `node` and
`args` to the absolute path of
`packages/mcp-server/bin/tasknebula-mcp.mjs` in your checkout. Keep the URL and
key in the client's private environment/configuration, never in this repo.

## Package layout

```text
bin/tasknebula-mcp.mjs   stdio executable
src/server.ts            shared MCP registration
src/stdio.ts             local stdio transport
src/http.ts              HTTP transport scaffolding
src/client.ts            TaskNebula REST client
src/auth.ts              API-key / OAuth scaffolding
src/tools/                tool definitions
src/resources.ts          resources and templates
src/prompts.ts            prompt definitions
```

## Tool surface

The current source registers tools for issue create/read/update/assignment,
comments, transitions, subtasks, PR links, search, projects, assigned work, and
workload. Treat the web REST schema as authoritative: MCP input enums and
payloads have known drift and must be verified against the route before a tool
is expanded or published.

Agent-origin metadata can be supplied through `TASKNEBULA_AGENT_ACTOR`; it does
not replace server-side authorization, approval, tenancy, audit, or idempotency.

## Publication definition of done

1. Scoped API-key or OAuth web-route authentication works end to end.
2. Tool contracts match current REST validation and organization ownership.
3. Streamable HTTP/OAuth discovery and replay behavior pass protocol tests.
4. Every call records actor, scope, tool, effect, and outcome audit evidence.
5. The packed npm tarball installs and starts in clean Claude/Codex/Cursor test
   environments.
6. The package is actually published before README examples switch to `npx` or
   `pnpm add`.

See [`CLAUDE.md`](CLAUDE.md) for package-specific rules and
[`../../docs/AGENT_RUNTIME.md`](../../docs/AGENT_RUNTIME.md) for shared agent
safety/runtime requirements.
