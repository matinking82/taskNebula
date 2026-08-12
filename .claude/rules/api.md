---
paths:
  - 'apps/web/src/app/api/**/*.ts'
---

# API route rules (apps/web/src/app/api)

- **Auth first**: browser-only protected routes verify the NextAuth v5 session. Routes in the documented MCP
  tool REST surface resolve `resolveApiActor(request)` before touching data, then apply the same canonical
  permission guards. Invalid supplied credentials fail closed, and API-key actors are bounded to the key's
  organization. Do not silently fall back from a bad key to a browser session.
- **Tenant isolation**: scope every DB query by the caller's `organization_id`; never trust an org/project id from the request body without authorization.
- **Validate input**: parse request bodies and query params with **Zod**; return 400 on failure. Never pass unvalidated input to the DB.
- **Errors**: return consistent JSON error shapes and correct status codes; don't leak stack traces, SQL, or secrets in responses or logs.
- **OpenAPI**: regenerate with `pnpm --filter @tasknebula/web openapi:gen` and verify with `openapi:check`; keep route changes reflected in `apps/web/public/openapi.json`.
- **Side effects**: emit audit-log entries for mutating actions where the schema supports it.
