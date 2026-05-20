# Replyline Docker Stack

## Purpose

Replyline is a desktop Tauri app and can run without Docker. Docker stack is used for local AI observability/infrastructure (Langfuse + storage + optional vector DB) during beta operations and diagnostics.

## Services

| Service               | Role                                     | Required for stable beta | Expected state                     |
| --------------------- | ---------------------------------------- | ------------------------ | ---------------------------------- |
| `langfuse-web`        | Langfuse UI/API                          | Optional                 | `running`                          |
| `langfuse-worker`     | Langfuse background worker               | Optional                 | `running`                          |
| `langfuse-db`         | Postgres for Langfuse transactional data | Optional                 | `running (healthy)`                |
| `langfuse-clickhouse` | OLAP storage for traces/observations     | Optional                 | `running (healthy)`                |
| `langfuse-redis`      | Queue/cache for Langfuse                 | Optional                 | `running (healthy)`                |
| `langfuse-minio`      | Object storage for Langfuse uploads      | Optional                 | `running (healthy)`                |
| `langfuse-minio-init` | One-shot bucket bootstrap (`langfuse`)   | Optional                 | `exited (0)` after successful init |
| `qdrant`              | Vector DB                                | Experimental             | `running` if used                  |

`langfuse-minio-init` is expected to stop after successful bucket creation. `exited (0)` is healthy for this init container.

## Source of truth

- Base compose: external path (`REPLYLINE_AI_STACK_COMPOSE` or default `C:\Users\iurii\ai-stack\docker-compose.yml`)
- Replyline override: `infra/replyline-ai-stack.override.yml`
- Health script: `scripts/docker-replyline-health.ps1`

## Lifecycle

Start or recover:

```powershell
pnpm docker:replyline:restore:ai
```

Health check:

```powershell
pnpm docker:replyline:check
pnpm docker:replyline:check:dry
```

Auto-heal:

```powershell
pnpm docker:replyline:heal
pnpm docker:replyline:heal:dry
```

Logs:

```powershell
pnpm docker:replyline:logs
pnpm docker:replyline:logs:dry
```

Stop without deleting data:

```powershell
pnpm docker:replyline:down
pnpm docker:replyline:down:dry
```

## Ports

Current host mappings (replyline project):

| Service               | Container      | Host                                 |
| --------------------- | -------------- | ------------------------------------ |
| `langfuse-web`        | `3000`         | `13000`                              |
| `langfuse-db`         | `5432`         | `127.0.0.1:15433`                    |
| `langfuse-redis`      | `6379`         | `127.0.0.1:16379`                    |
| `langfuse-clickhouse` | `8123`, `9000` | `127.0.0.1:18123`, `127.0.0.1:19009` |
| `langfuse-minio`      | `9000`, `9001` | `19090`, `127.0.0.1:19091`           |
| `qdrant`              | `6333`, `6334` | `16333`, `16334`                     |

Recommendation: keep DB/cache/admin ports bound to `127.0.0.1`. Public host exposure should be intentional.

## Volumes

- `replyline_langfuse-db-data`
- `replyline_langfuse-ch-data`
- `replyline_langfuse-ch-logs`
- `replyline_langfuse-redis-data`
- `replyline_langfuse-minio-data`
- `replyline_qdrant-data`

Do not remove volumes without explicit backup and manual confirmation.

## Secrets and env

- Do not commit runtime `.env` files.
- Keep secret values outside repo (env files or Docker secret tooling).
- `docker inspect` or audit reports must never include raw secret values.
- `.env.example` template is currently absent in this repo; use external local env management and document required keys before sharing setup.

## Safe update policy

1. Pin image tags for stable beta; avoid floating `latest`.
2. Upgrade one service at a time.
3. Run `pnpm docker:replyline:check` and `pnpm smoke` after image changes.
4. Review migration notes before major upgrades (Langfuse/ClickHouse/Postgres/Qdrant/MinIO).

## Danger zone (manual only)

Destructive commands are manual and require explicit confirmation:

- `docker compose down -v`
- `docker volume rm ...`
- `docker system prune ...`

These are intentionally not part of default Replyline scripts.
