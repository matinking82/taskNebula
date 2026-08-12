<div align="center">

# TaskNebula

### Self-hosted, AI-native project management in one Docker command

[![Docker Pulls](https://img.shields.io/docker/pulls/neuraparse/tasknebula?style=for-the-badge&logo=docker&color=2496ED)](https://hub.docker.com/r/neuraparse/tasknebula)
[![Docker Image](https://img.shields.io/docker/v/neuraparse/tasknebula/latest?style=for-the-badge&logo=docker&label=image&color=2496ED)](https://hub.docker.com/r/neuraparse/tasknebula/tags)
[![Platform](https://img.shields.io/badge/platform-linux%2Famd64-111827?style=for-the-badge&logo=linux)](#docker-image)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![30 locales](https://img.shields.io/badge/i18n-30%20locales-8b5cf6?style=for-the-badge)](#ai-privacy-and-languages)
[![License MIT](https://img.shields.io/badge/License-MIT-16a34a?style=for-the-badge)](LICENSE)

TaskNebula is an open-source issue tracker for teams that want Linear-style
speed, Jira-style depth, and optional AI assistance without giving up control
of their data. Run it with Docker, bring your own OpenAI or Anthropic key, or
keep AI disabled and use the built-in native planner.

<p>
  <a href="#quick-start"><img src="https://img.shields.io/badge/Run%20with-Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Run with Docker"/></a>
  <a href="https://hub.docker.com/r/neuraparse/tasknebula"><img src="https://img.shields.io/badge/Open-Docker%20Hub-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Open Docker Hub"/></a>
  <a href="https://raw.githubusercontent.com/neuraparse/tasknebula/main/docker-compose.yml"><img src="https://img.shields.io/badge/View-compose.yml-111827?style=for-the-badge&logo=yaml&logoColor=white" alt="View compose file"/></a>
</p>

[Quick start](#quick-start) ·
[Mobile app](#mobile-app-coming-soon) ·
[Features](#features) ·
[Docker image](#docker-image) ·
[Deployment](#deployment) ·
[Docs](#docs)

<br/>

<img src="images/readme-home-2026-06-23.png" alt="TaskNebula home" width="100%"/>

<br/>

<img src="images/readme-product-collage-2026-06-23.png" alt="TaskNebula product collage" width="100%"/>

</div>

---

## Quick Start

Pick the path that matches where you are deploying.

| Path                   | Best for                         | Command                                                                                                                                   |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **One-command Docker** | Fresh Linux VM or homelab server | `curl -fsSL https://raw.githubusercontent.com/neuraparse/tasknebula/main/scripts/quickstart.sh \| bash`                                   |
| **Docker Desktop**     | Local Mac, Windows, or Linux PC  | `curl -fsSLo compose.yml https://raw.githubusercontent.com/neuraparse/tasknebula/main/docker-compose.desktop.yml && docker compose up -d` |
| **Pinned production**  | Repeatable self-hosted releases  | `TASKNEBULA_IMAGE=neuraparse/tasknebula:<tag> docker compose up -d`                                                                       |
| **Source checkout**    | Local development or patching    | Follow [Development](#development); environment provisioning is required before Compose                                                   |

After boot, open **http://localhost:3000** and finish the first-run admin
wizard.

### Update Or Pin

```bash
./scripts/tasknebula-backup.sh
docker compose pull web && docker compose up -d

TASKNEBULA_IMAGE=neuraparse/tasknebula:<tag> docker compose up -d
```

For production hardening, reverse proxy setup, LiveKit, SMTP, OAuth, backups,
and self-update details, use [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Features

| Area                   | Highlights                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| **Project management** | Kanban, backlog, sprints, epics, subtasks, custom fields, issue links, attachments, imports       |
| **Collaboration**      | Comments, reactions, docs, project chat, presence, realtime updates, collaborative editing        |
| **AI assistance**      | Draft/issue assist, cited workspace Ask, native planner, agent activity, fail-closed previews     |
| **Admin & governance** | Multi-org roles, audit logs, registration controls, webhooks, API-key and policy scaffolding      |
| **Analytics**          | Burndown, velocity, cycle time, throughput, project health, time-in-status, dashboard cards       |
| **Self-hosting**       | Docker-first deploy, Postgres, Redis, health checks, durable work reconciler, optional voice/cron |

Importers currently cover **Jira**, **Linear**, **GitHub**, and **CSV**.

---

## AI, Privacy, And Languages

- **AI is opt-in.** Configure workspace or platform keys from the admin UI.
  OpenAI and Anthropic are supported, and the native planner works without an
  external LLM.
- **Self-hosted by default.** Your app, database, Redis, uploads, and optional
  voice server run in your own environment.
- **30 locale catalogs included.** Browser/device auto-detection, persisted
  language choice, native-name switching, and RTL support for Arabic and Hebrew
  are built in. Catalog/ICU parity is automated; linguistic review continues
  for legacy copy.

---

## Mobile App Coming Soon

Native mobile apps are on the way. Availability details will be shared when
they are ready.

---

## Docker Image

| Item              | Value                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Repository        | [`neuraparse/tasknebula`](https://hub.docker.com/r/neuraparse/tasknebula)                        |
| Recommended tag   | `latest` for demos; use a release tag for repeatable installs                                    |
| Platform          | `linux/amd64`                                                                                    |
| Runtime port      | `3000`                                                                                           |
| Health endpoint   | `GET /api/health`                                                                                |
| Required services | PostgreSQL 16 + `pgvector`, Redis 7                                                              |
| Optional services | LiveKit voice profile, scheduled-product cron, SMTP, experimental OAuth, OpenAI / Anthropic keys |
| Inspect digest    | `docker buildx imagetools inspect neuraparse/tasknebula:<tag>`                                   |

---

## Deployment

TaskNebula is designed around a small production surface:

- `web`: Next.js standalone runtime
- `postgres`: PostgreSQL 16 with pgvector
- `redis`: cache, realtime fan-out, and background coordination
- `approval-reconciler`: durable approval-effect delivery and project-agent run recovery
- optional `livekit` (`voice` profile): voice rooms
- optional `cron` profile: standup, janitor, embeddings, rollover, and version checks

First generate an ignored `.env` with unique database, Redis, auth, and LiveKit
credentials (`bash scripts/setup.sh` does this interactively). Compose refuses to
start when required secrets are absent. Voice remains disabled unless the
`voice` profile and its URLs are configured. Then use:

```bash
docker compose up -d
docker compose ps
curl -fsS http://localhost:3000/api/health
docker compose logs -f web
```

Use `TASKNEBULA_IMAGE=neuraparse/tasknebula:<tag>` when you want a pinned,
repeatable deployment. Use `latest` only for quick demos.

---

## Docs

| Need                   | Link                                           |
| ---------------------- | ---------------------------------------------- |
| Full release history   | [CHANGELOG.md](CHANGELOG.md)                   |
| Documentation index    | [docs/README.md](docs/README.md)               |
| Current status         | [docs/STATUS.md](docs/STATUS.md)               |
| Deployment guide       | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       |
| Architecture           | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   |
| Agent runtime contract | [docs/AGENT_RUNTIME.md](docs/AGENT_RUNTIME.md) |
| Roadmap                | [docs/ROADMAP_2026.md](docs/ROADMAP_2026.md)   |
| Release process        | [docs/RELEASE.md](docs/RELEASE.md)             |
| Contributing           | [CONTRIBUTING.md](CONTRIBUTING.md)             |
| AI agent/project guide | [CLAUDE.md](CLAUDE.md)                         |

---

## Development

For an interactive fresh-clone setup, run `bash scripts/setup.sh`. It installs
dependencies, provisions ignored environment files, generates local secrets,
and can start PostgreSQL/Redis and apply migrations.

The equivalent manual flow is:

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
# Populate AUTH_SECRET/NEXTAUTH_SECRET, POSTGRES_PASSWORD, REDIS_PASSWORD,
# LIVEKIT_API_KEY, and LIVEKIT_API_SECRET with unique random values. The setup
# script performs this wiring automatically and is the recommended path.
# DATABASE_URL in apps/web/.env.local must use the same generated Postgres
# credentials; setup.sh also performs this URL-safe wiring.
pnpm install
docker compose up -d --wait postgres redis
pnpm db:migrate
pnpm --filter @tasknebula/web dev
```

For bundled voice, set `LIVEKIT_URL` and `NEXT_PUBLIC_LIVEKIT_URL`, then run
`docker compose --profile voice up -d`. The base stack does not open LiveKit's
host-network listeners.

The root `pnpm dev` starts every workspace, including the optional Hocuspocus
collaboration service; use its documented environment contract before choosing
that command.

Before pushing code, run:

```bash
pnpm --filter @tasknebula/mcp-server build
pnpm i18n:check
pnpm hygiene:check
pnpm ui:check
pnpm docs:check
pnpm type-check
pnpm lint
pnpm test
pnpm --filter @tasknebula/web openapi:check
git diff --check
```

---

## License

MIT. See [LICENSE](LICENSE).

<div align="center">

Built by [Neura Parse](https://neuraparse.com) · Powered by open source

</div>
