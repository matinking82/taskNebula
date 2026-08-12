# TaskNebula project status

**Verified:** 2026-08-12 · **Version:** 0.14.0 · **Lifecycle:** beta,
self-hostable

This is the only live capability snapshot. Future work belongs in
[`ROADMAP_2026.md`](ROADMAP_2026.md); released history belongs in
[`../CHANGELOG.md`](../CHANGELOG.md).

## Checked tree inventory

The values below are a dated inventory, not agent instructions:

| Surface                                    | 2026-08-12 tree |
| ------------------------------------------ | --------------: |
| Next.js API `route.ts` files               |             280 |
| Drizzle `pgTable` definitions              |             115 |
| Schema files excluding the re-export index |              54 |
| Journaled SQL migrations                   |              61 |
| Web Jest test files                        |             277 |
| Playwright spec files                      |               8 |
| Locale catalogs                            |              30 |

## Working product areas

- Core project management: organization/project membership, issues, comments,
  links, subtasks, custom fields, attachments, boards, backlog, sprints,
  initiatives, intake, time tracking, releases/versions, components, labels,
  resolution, imports, and analytics surfaces.
- Realtime: organization-scoped SSE with Redis fan-out when configured;
  Tiptap/Yjs collaboration through Hocuspocus with Postgres persistence and
  Redis scale-out.
- AI/provider foundations: OpenAI and Anthropic project-agent adapters, BYOK
  credential resolution, cost audit/guard on covered paths, Ask workspace RAG,
  triage/planning, standup/janitor jobs, and coding-agent session integrations.
- Ask grounding: one canonical `[TN-…]` / `[DOC-…]` citation grammar, unresolved
  marker reporting, SSE source/citation events, and Sidecar citation links.
- Agent safety foundation: approval-gated project mutations fail closed to
  preview; local Claude/Codex subprocesses receive an allowlisted environment;
  a typed bounded graph/research topology has focused tests.
- Enterprise scaffolding: SAML/SCIM, audit/SIEM, trust and AI transparency
  surfaces, permission/security scheme configuration.
- CI: MCP build, i18n parity, public-repository hygiene, UI contract,
  type-check, lint, and tests run on pushes and pull requests to `main`.

## Important limitations

### Trust and enforcement

1. PostgreSQL RLS is not implemented. Tenant isolation depends on explicit
   organization filters and authorization in application code.
2. Workflow transitions, validators, conditions, roles, approvals, targets,
   and post-actions are persisted but are not consistently enforced by one service across issue
   PATCH, board drag, bulk operations, automations, and agent webhooks.
3. Project-agent approval is containment, not a complete queue: guarded runs
   now make zero writes, but proposed effects are not yet persisted and resumed
   through an atomic exactly-once approval/apply worker.
4. Existing generic approval endpoints and webhook/session state paths still
   need compare-and-swap/idempotency hardening.

### Agent and research maturity

1. The tested graph runtime is a library foundation. Current project agents do
   not persist node checkpoints or resume through a leased worker.
2. Ask is scoped workspace RAG, not deep research. It has no web crawler,
   durable activity history, source snapshots/claim tables, parallel durable
   fan-out, or mid-run refine/interrupt product flow.
3. Current project-agent bulk writes need transactional/idempotent effect
   handling. Ask and project-plan providers now have finite timeouts and request
   cancellation, but retry policy and global budget/cancellation coverage are
   not yet uniform across every AI path.
4. Coding-agent local execution still runs from the web request process; a
   restart can lose active work even though its secret environment is now
   constrained.

See [`AGENT_RUNTIME.md`](AGENT_RUNTIME.md) for the exact maturity matrix and
definition of a production engine.

### Product and operations seams

- OAuth providers are registered without the complete database-adapter/user
  lifecycle needed for production organization access.
- MCP tooling is present but package publication and end-to-end API-key route
  authentication remain incomplete.
- Some configurable permission/security/feature controls are not enforced by
  all consumers.
- Notifications, pagination/virtualization, mounted analytics, import depth,
  and full external-provider/device smoke coverage remain uneven.
- The pgvector Ask leg is intentionally dormant until an organization-safe
  embedder is supplied; lexical retrieval remains the active path.
- Database and Hocuspocus integration coverage is much thinner than web unit
  coverage.

## Current priority

The next release work should converge existing paths rather than add another
parallel agent or workflow surface:

1. atomic workflow-transition service;
2. durable agent run/step/checkpoint/event/effect storage and leased worker;
3. exactly-once approval/apply and idempotent bulk effects;
4. tenant/auth hardening and cross-organization negative tests;
5. source/claim provenance plus replayable research progress;
6. budget, timeout, cancellation, trace, and recovery coverage on every AI path.

The ordered plan and definitions of done are in
[`ROADMAP_2026.md`](ROADMAP_2026.md).
