<div align="center">

# TaskNebula is now N-Task

### Continuing at [n-n.io](https://n-n.io) as an agentic product in the N-N enterprise family

[![N-Task](https://img.shields.io/badge/N--Task-n--n.io-254AD4?style=for-the-badge)](https://n-n.io/products/n-task)
[![Cloud](https://img.shields.io/badge/Cloud-available-1D2025?style=for-the-badge)](https://n-n.io/products/n-task)
[![Offline](https://img.shields.io/badge/Offline%20%2F%20on--prem-available-1D2025?style=for-the-badge)](https://n-n.io/products/n-task)
[![Web and mobile](https://img.shields.io/badge/Web%20%2B%20mobile-apps-1D2025?style=for-the-badge)](https://n-n.io/products/n-task)
[![Open-source support](https://img.shields.io/badge/open--source%20support-ended-6b7280?style=for-the-badge)](#open-source-support-has-ended)

**TaskNebula has moved.** Development continues as **N-Task** on
[n-n.io](https://n-n.io): a powerful, agentic project management product built
together with the other N-N enterprise applications.

<p>
  <a href="https://n-n.io/products/n-task"><img src="https://img.shields.io/badge/Discover-N--Task-254AD4?style=for-the-badge" alt="Discover N-Task"/></a>
  <a href="https://n-n.io"><img src="https://img.shields.io/badge/Visit-n--n.io-1D2025?style=for-the-badge" alt="Visit n-n.io"/></a>
  <a href="https://n-n.io/contact"><img src="https://img.shields.io/badge/Get%20in%20touch-n--n.io%2Fcontact-111827?style=for-the-badge" alt="Get in touch"/></a>
</p>

[N-Task](https://n-n.io/products/n-task) ·
[All products](https://n-n.io/products) ·
[Contact](https://n-n.io/contact) ·
[Legacy TaskNebula](#legacy-tasknebula-archived)

</div>

---

> [!IMPORTANT]
> **Open-source support for TaskNebula has ended.** This repository is no
> longer maintained. All new development happens in **N-Task** at
> [n-n.io](https://n-n.io/products/n-task).

## From TaskNebula To N-Task

TaskNebula started as an open-source, AI-native issue tracker. It now continues
as **N-Task**, which brings projects, tasks, and team documentation together in
one workspace and is developed as a powerful **agentic** product.

- **Agentic by design.** N-Task is built around AI agents that work alongside
  your team, not bolted on as a sidebar feature.
- **Web and mobile.** Work from the browser or the N-Task mobile app, so
  projects and tasks stay with your team wherever they are.
- **Part of an enterprise suite.** N-Task is developed together with the other
  N-N enterprise applications below.
- **Built for organizations.** Deployment, licensing, and support are offered
  for teams that need a product they can depend on.

## The N-N Product Family

| Product                                                | What it does                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **[N-Task](https://n-n.io/products/n-task)**           | Projects, tasks, and team documentation in one agentic workspace, on web and mobile     |
| **[N-Workbench](https://n-n.io/products/n-workbench)** | Persistent coding sessions, project management, and coordinated agent work, self-hosted |
| **[N-CRM](https://n-n.io/products/n-crm)**             | Accounts, contacts, sales opportunities, and team activities in separate workspaces     |
| **[N-Case](https://n-n.io/products/n-case)**           | Projects, documents, reviews, and signing processes in one workspace                    |
| **[N-People](https://n-n.io/products/n-people)**       | Employee records, onboarding tasks, and reviewed leave requests                         |
| **[N-Procure](https://n-n.io/products/n-procure)**     | Supplier records and independently reviewed purchase requests                           |

Explore them all at [n-n.io/products](https://n-n.io/products).

## Deploy It Your Way

| Option                   | What you get                                                                |
| ------------------------ | --------------------------------------------------------------------------- |
| **Cloud**                | Managed N-Task, ready to use without running your own infrastructure        |
| **Offline / on-premise** | N-Task inside your own network, including isolated and offline setups       |
| **Web and mobile**       | The same workspace in the browser and in the N-Task mobile app              |
| **Flexible licensing**   | Every kind of license, from subscriptions to tailored enterprise agreements |

See installation and licensing details on the
[N-Task product page](https://n-n.io/products/n-task), or
[get in touch](https://n-n.io/contact) to find the right fit for your
organization.

## Open-Source Support Has Ended

What this means for this repository:

- **v0.17.3 is the final TaskNebula release.** No further features, bug fixes,
  security updates, releases, or Docker images will be published here.
- Issues and pull requests are no longer reviewed or answered.
- The existing source code and previously published images stay available
  **as-is** under the [MIT License](LICENSE), without warranty or support.
- If you run TaskNebula today, we recommend moving to N-Task.
  [Contact us](https://n-n.io/contact) to talk about your setup.

---

## Legacy TaskNebula (Archived)

The reference below is kept for existing self-hosted installations only. It is
no longer updated.

<details>
<summary><strong>Self-hosting reference</strong></summary>

<br/>

TaskNebula runs as a Docker Compose stack: a Next.js standalone `web` service,
PostgreSQL 16 with `pgvector`, Redis 7, an `approval-reconciler`, and optional
`voice` (LiveKit) and `cron` profiles.

| Item            | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| Image           | [`neuraparse/tasknebula`](https://hub.docker.com/r/neuraparse/tasknebula) |
| Final release   | `0.17.3`                                                                  |
| Platform        | `linux/amd64`                                                             |
| Runtime port    | `3000`                                                                    |
| Health endpoint | `GET /api/health`                                                         |

Back up before touching an existing installation, and pin the final release
tag instead of `latest`:

```bash
./scripts/tasknebula-backup.sh
TASKNEBULA_IMAGE=neuraparse/tasknebula:0.17.3 docker compose up -d
docker compose ps
curl -fsS http://localhost:3000/api/health
```

| Need                 | Link                                         |
| -------------------- | -------------------------------------------- |
| Release history      | [CHANGELOG.md](CHANGELOG.md)                 |
| Deployment guide     | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)     |
| Documentation index  | [docs/README.md](docs/README.md)             |
| Last recorded status | [docs/STATUS.md](docs/STATUS.md)             |
| Architecture         | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

</details>

<details>
<summary><strong>Development reference</strong></summary>

<br/>

`bash scripts/setup.sh` installs dependencies, provisions ignored environment
files, generates local secrets, and can start PostgreSQL/Redis and apply
migrations. Then run `pnpm --filter @tasknebula/web dev`.

The complete local verification gate is:

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

</details>

---

## License

The TaskNebula source code in this repository remains available under the MIT
License. See [LICENSE](LICENSE). N-Task is a separate product; its licensing is
available through [n-n.io](https://n-n.io/products/n-task).

<div align="center">

TaskNebula by [Neura Parse](https://neuraparse.com) · Now continuing as
[N-Task](https://n-n.io/products/n-task) at [n-n.io](https://n-n.io)

</div>
