# Docker Stack Audit - 2026-05-21

## Environment snapshot

- Repository: `iurii-izman/replyline`
- Branch: `main`
- Commit: `96a04f0a6d24dff5d7bde5a20dfa9433b24685d2`
- Docker Server: `29.4.1`
- Docker Compose plugin: `v5.1.3`
- Project observed in Docker: `replyline`

## File inventory

| File                                            | Purpose                                                   | Current status          | Keep / update / remove / document |
| ----------------------------------------------- | --------------------------------------------------------- | ----------------------- | --------------------------------- |
| `scripts/docker-replyline-health.ps1`           | Health check + scoped recovery + port preflight           | Active                  | update                            |
| `scripts/docker-replyline-compose-common.ps1`   | Compose context resolution                                | Active                  | keep                              |
| `scripts/docker-replyline-restore-ai-stack.ps1` | `compose up -d` + follow-up health check                  | Active                  | keep                              |
| `scripts/docker-replyline-down-ai-stack.ps1`    | `compose down --remove-orphans` wrapper                   | Active                  | keep                              |
| `scripts/docker-replyline-logs-ai-stack.ps1`    | `compose logs` wrapper                                    | Active                  | keep                              |
| `infra/replyline-ai-stack.override.yml`         | Replyline labels/ports override for external base compose | Restored in this change | keep                              |
| `docs/docker-stack.md`                          | Stack lifecycle and policy runbook                        | Added in this change    | keep                              |
| `.env.example`                                  | Template for docker env                                   | Not found in repo       | document gap                      |

## Compose topology

- Active compose context in running containers:
  - `C:\Users\iurii\ai-stack\docker-compose.yml` (base)
  - `C:\Dev\replyline\infra\replyline-ai-stack.override.yml` (replyline override)
- Docker project: `replyline`
- Network: `replyline_default`
- Volumes: `replyline_langfuse-*`, `replyline_qdrant-data`

Dependency map:

- `langfuse-web` -> `langfuse-db`, `langfuse-redis`, `langfuse-clickhouse`, `langfuse-minio`
- `langfuse-worker` -> `langfuse-db`, `langfuse-redis`, `langfuse-clickhouse`, `langfuse-minio`
- `langfuse-minio-init` -> `langfuse-minio` (one-shot bootstrap)
- `qdrant` -> standalone (no current hard dependency from Langfuse stack)

## Live container inventory

| Container                       | Image                          | Role              | Required?    | Expected state | Actual state | Health  | Ports                                            | Volumes                                                    | Network             | Notes                     |
| ------------------------------- | ------------------------------ | ----------------- | ------------ | -------------- | ------------ | ------- | ------------------------------------------------ | ---------------------------------------------------------- | ------------------- | ------------------------- |
| `replyline-langfuse-web`        | `langfuse/langfuse:3`          | observability-app | optional     | running        | running      | n/a     | `13000->3000`                                    | none                                                       | `replyline_default` | exposed on `0.0.0.0`      |
| `replyline-langfuse-worker`     | `langfuse/langfuse-worker:3`   | worker            | optional     | running        | running      | n/a     | none                                             | none                                                       | `replyline_default` | internal worker           |
| `replyline-langfuse-db`         | `postgres:17-alpine`           | db                | optional     | running        | running      | healthy | `127.0.0.1:15433->5432`                          | `replyline_langfuse-db-data`                               | `replyline_default` | local-only bind           |
| `replyline-langfuse-redis`      | `redis:7-alpine`               | cache             | optional     | running        | running      | healthy | `127.0.0.1:16379->6379`                          | `replyline_langfuse-redis-data`                            | `replyline_default` | local-only bind           |
| `replyline-langfuse-clickhouse` | `clickhouse/clickhouse-server` | olap-db           | optional     | running        | running      | healthy | `127.0.0.1:18123->8123`, `127.0.0.1:19009->9000` | `replyline_langfuse-ch-data`, `replyline_langfuse-ch-logs` | `replyline_default` | image tag floating        |
| `replyline-langfuse-minio`      | `minio/minio`                  | object-storage    | optional     | running        | running      | healthy | `19090->9000`, `127.0.0.1:19091->9001`           | `replyline_langfuse-minio-data`                            | `replyline_default` | `9000` exposed publicly   |
| `replyline-langfuse-minio-init` | `minio/mc`                     | init              | optional     | exited(0)      | exited(0)    | n/a     | none                                             | none                                                       | `replyline_default` | expected one-shot init    |
| `replyline-qdrant`              | `qdrant/qdrant:latest`         | vector-db         | experimental | running        | running      | n/a     | `16333->6333`, `16334->6334`                     | `replyline_qdrant-data`                                    | `replyline_default` | floating tag, public bind |

## Ports audit

| Service               | Container port | Host port        | Needed by host?                   | Needed by app?                   | Decision                     |
| --------------------- | -------------- | ---------------- | --------------------------------- | -------------------------------- | ---------------------------- |
| `langfuse-web`        | `3000`         | `13000`          | yes (UI/API access)               | optional                         | keep                         |
| `langfuse-db`         | `5432`         | `15433`          | troubleshooting only              | no (containers use internal DNS) | keep local-only              |
| `langfuse-redis`      | `6379`         | `16379`          | troubleshooting only              | no                               | keep local-only              |
| `langfuse-clickhouse` | `8123`, `9000` | `18123`, `19009` | troubleshooting/admin             | no                               | keep local-only              |
| `langfuse-minio`      | `9000`         | `19090`          | sometimes for host access         | no                               | consider `127.0.0.1` bind    |
| `langfuse-minio`      | `9001`         | `19091`          | console access                    | no                               | keep local-only              |
| `qdrant`              | `6333`, `6334` | `16333`, `16334` | only if experiments need host API | no for stable beta               | optional/consider local-only |

## Image/version freshness

| Service         | Image                          | Current tag     | Pin quality  | Freshness risk | Recommendation                          |
| --------------- | ------------------------------ | --------------- | ------------ | -------------- | --------------------------------------- |
| langfuse-web    | `langfuse/langfuse:3`          | `3`             | major pinned | medium         | keep, track Langfuse v3 release notes   |
| langfuse-worker | `langfuse/langfuse-worker:3`   | `3`             | major pinned | medium         | keep aligned with web tag               |
| postgres        | `postgres:17-alpine`           | `17-alpine`     | major pinned | low-medium     | acceptable for beta                     |
| redis           | `redis:7-alpine`               | `7-alpine`      | major pinned | low-medium     | acceptable for beta                     |
| clickhouse      | `clickhouse/clickhouse-server` | implicit latest | low          | high           | pin explicit compatible version         |
| minio           | `minio/minio`                  | implicit latest | low          | high           | pin explicit release tag                |
| minio-init      | `minio/mc`                     | implicit latest | low          | high           | pin explicit release tag                |
| qdrant          | `qdrant/qdrant:latest`         | `latest`        | low          | high           | pin explicit version; keep experimental |

Reference note: Langfuse v3 self-hosting docs list ClickHouse/Postgres/Redis/S3 as required infrastructure for Langfuse; ClickHouse is mandatory in v3 architecture.

## Security findings

| Finding                                                    | Severity | Evidence                                                                  | Fix                                                      |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | -------------------------------------------------------- |
| External base compose contains hardcoded local credentials | Medium   | `C:\Users\iurii\ai-stack\docker-compose.yml` has inline passwords/secrets | move to local env/secrets store; keep out of repo        |
| Floating image tags (`latest` or implicit)                 | Medium   | `qdrant`, `minio`, `minio/mc`, `clickhouse`                               | pin explicit tested tags                                 |
| Public bind for `langfuse-web`, `minio:9000`, `qdrant`     | Medium   | live ports on `0.0.0.0`                                                   | bind to `127.0.0.1` unless remote access required        |
| Missing `.env.example` for Docker stack                    | Low      | not found in repo                                                         | add sanitized template or document external env contract |

## Scripts audit

| Script                            | Result                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| `docker:replyline:check`          | Works against managed labels; now includes role/version findings and expected init exits |
| `docker:replyline:check:dry`      | Safe; no mutations                                                                       |
| `docker:replyline:heal`           | Scoped recovery, guarded by compose-safety and port preflight                            |
| `docker:replyline:heal:dry`       | Safe preview                                                                             |
| `docker:replyline:restore:ai`     | `compose up -d --remove-orphans` + health                                                |
| `docker:replyline:restore:ai:dry` | Safe preview                                                                             |
| `docker:replyline:down`           | Non-destructive by default (`--remove-orphans`, no volumes)                              |
| `docker:replyline:down:dry`       | Safe preview                                                                             |
| `docker:replyline:logs`           | Read-only                                                                                |
| `docker:replyline:logs:dry`       | Safe preview                                                                             |

## Required/optional/experimental stack

- Minimum stable-beta for Replyline app itself: no Docker services required.
- Minimum Langfuse observability stack: `langfuse-web`, `langfuse-worker`, `langfuse-db`, `langfuse-redis`, `langfuse-clickhouse`, `langfuse-minio`, `langfuse-minio-init`.
- Experimental: `qdrant`.

## Recommended cleanup (non-destructive)

1. Keep `replyline` project containers and volumes as-is.
2. Keep `langfuse-minio-init` in `exited (0)` state (expected).
3. Mark `qdrant` explicitly optional/experimental in docs.
4. Pin floating image tags before release hardening.
5. Keep destructive cleanup (`down -v`, volume removal, prune) manual-only with explicit confirmation.

## Final score

`78 / 100` (partially ok: operational but with pinning/exposure/documentation hardening needed).

## Validation matrix

| Command                           | Status             | Notes                                                              |
| --------------------------------- | ------------------ | ------------------------------------------------------------------ |
| `pnpm format:check`               | pass               | after markdown formatting fix                                      |
| `pnpm typecheck`                  | pass               |                                                                    |
| `pnpm lint`                       | pass               |                                                                    |
| `pnpm test:doc-links`             | pass               | fixed new doc links                                                |
| `pnpm test:consistency`           | pass               |                                                                    |
| `pnpm test:security-lanes`        | pass               | includes `audit:npm` + `rust:deps`                                 |
| `pnpm docker:replyline:check`     | pass               | `langfuse-minio-init` recognized as expected stopped               |
| `pnpm docker:replyline:check:dry` | pass               | safe dry-run                                                       |
| `pnpm docker:replyline:logs:dry`  | pass               | safe dry-run                                                       |
| `pnpm smoke`                      | pass               | full compile/test lane passed                                      |
| `pnpm verify:fast`                | pass               | includes smoke + security/public footprint                         |
| `pnpm release:freeze:check`       | pass-with-warnings | warns about pre-existing dirty-tree files outside freeze allowlist |
