---
description: Prepare and, only with explicit authorization, publish a TaskNebula release
argument-hint: '<new SemVer>'
allowed-tools: Read, Edit, Grep, Glob, Bash(pnpm:*), Bash(node scripts/i18n-check.mjs:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git pull:*), Bash(git push:*), Bash(git tag:*), Bash(gh release create:*), Bash(docker compose build:*), Bash(docker build:*), Bash(docker tag:*), Bash(docker push:*), Bash(docker buildx imagetools inspect:*)
---

Read `CLAUDE.md`, any ignored operator-local guide, and `docs/RELEASE.md` in
full. Prepare version `$1` from the current root `package.json`; never assume a
hardcoded previous series.

Update the canonical version surfaces and changelog, regenerate OpenAPI with
`pnpm --filter @tasknebula/web openapi:gen`, then run `/verify`. Review the full
diff for secrets and deployment-specific values.

GitHub publication and Docker/registry publication are separate boundaries.
Do not push a commit or tag, create a hosted release, publish an image, or move
`latest` unless the user explicitly authorized that exact destination in the
current task. A request to prepare a release is not implicit publication
permission. Follow the ordering and rollback checks in `docs/RELEASE.md`.
