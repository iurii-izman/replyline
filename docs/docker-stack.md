# Replyline Docker Stack

## Purpose

Replyline is a desktop Tauri app and can run without Docker. Docker stack is used for local AI observability/infrastructure (Langfuse + storage + optional vector DB) during beta operations and diagnostics.

## Services

| Service                      | Role                                       | Required for stable beta | Expected state                     |
| ---------------------------- | ------------------------------------------ | ------------------------ | ---------------------------------- |
| `langfuse-web`               | Langfuse UI/API                            | Optional                 | `running`                          |
| `langfuse-worker`            | Langfuse background worker                 | Optional                 | `running (healthy)`                |
| `langfuse-db`                | Postgres for Langfuse transactional data   | Optional                 | `running (healthy)`                |
| `langfuse-clickhouse`        | OLAP storage for traces/observations       | Optional                 | `running (healthy)`                |
| `langfuse-redis`             | Queue/cache for Langfuse                   | Optional                 | `running (healthy)`                |
| `langfuse-minio-permissions` | One-shot legacy volume ownership migration | Optional                 | `exited (0)` after successful init |
| `langfuse-minio`             | Object storage for Langfuse uploads        | Optional                 | `running (healthy)`                |
| `langfuse-minio-init`        | One-shot bucket bootstrap (`langfuse`)     | Optional                 | `exited (0)` after successful init |
| `qdrant`                     | Vector DB                                  | Experimental             | `running` if used                  |

`langfuse-minio-permissions` and `langfuse-minio-init` are expected to stop with code 0 after successful ownership migration and bucket creation.

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
pnpm docker:replyline:check:strict
pnpm docker:replyline:storage:check
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

Consistent volume backup:

```powershell
pnpm docker:replyline:backup:dry
pnpm docker:replyline:backup
```

The backup command stops the Compose project, copies all project-labelled volumes into immutable timestamped backup volumes, labels the backups for inventory, and starts the project again in a `finally` block. It never removes source or backup volumes.

Restore preview:

```powershell
pnpm docker:replyline:backup:restore YYYYMMDD-HHMMSS -DryRun
```

Actual restore additionally requires `-ConfirmRestore`. Legacy backups without a completion marker require `-AllowLegacyBackup` after manual verification. Restore overwrites active volume contents but never deletes the backup volumes.

Stop without deleting data:

```powershell
pnpm docker:replyline:down
pnpm docker:replyline:down:dry
```

## Ports

Current host mappings (replyline project):

| Service               | Container      | Host                                 |
| --------------------- | -------------- | ------------------------------------ |
| `langfuse-web`        | `3000`         | `127.0.0.1:13000`                    |
| `langfuse-db`         | `5432`         | `127.0.0.1:15433`                    |
| `langfuse-redis`      | `6379`         | `127.0.0.1:16379`                    |
| `langfuse-clickhouse` | `8123`, `9000` | `127.0.0.1:18123`, `127.0.0.1:19009` |
| `langfuse-minio`      | `9000`, `9001` | `127.0.0.1:19090`, `127.0.0.1:19091` |
| `qdrant`              | `6333`, `6334` | `127.0.0.1:16333`, `127.0.0.1:16334` |

Default policy: local-only binds for Langfuse/MinIO/Qdrant ports. If LAN/public access for `langfuse-web` is required, change mapping intentionally (for example `13000:3000`) and keep this decision documented.

## Volumes

- `replyline_langfuse-db-data`
- `replyline_langfuse-ch-data`
- `replyline_langfuse-ch-logs`
- `replyline_langfuse-redis-data`
- `replyline_langfuse-minio-data`
- `replyline_qdrant-data`

Do not remove volumes without explicit backup and manual confirmation.

## Secrets and env contract

- Do not commit runtime `.env` files.
- Keep secret values outside repo (env files or Docker secret tooling).
- `docker inspect` or audit reports must never include raw secret values.
- Sanitized template in repo: `.env.docker.example`.
- Copy template to local non-committed file and set real values:

```powershell
Copy-Item .env.docker.example .env.docker.local
```

- Rotate secrets by replacing local values and restarting stack (`pnpm docker:replyline:restore:ai`).
- Migrate legacy inline values from the external base compose into its local `.env`:

```powershell
pnpm docker:replyline:secrets:migrate
```

The migration creates a timestamped backup beside the external compose file and never prints secret values.
Use `pwsh -File scripts/docker-replyline-migrate-secrets.ps1 -DryRun` to preview variable names without changing files.

## Image pinning policy

1. Use exact tested tags and digests in `infra/replyline-ai-stack.override.yml`.
2. Never replace floating tags blindly.
3. Use `infra/replyline-ai-stack.pinned.example.yml` as a template when evaluating future upgrades.
4. Upgrade the repo override intentionally; do not rely on floating tags from the external base compose.
5. Upgrade one service at a time and validate with:
   - `pnpm docker:replyline:check`
   - `pnpm docker:replyline:check:strict`
   - `pnpm docker:replyline:storage:check`
   - `pnpm smoke`

`docker:replyline:check` reports warnings (floating tags, public binds, env template gap, expected stopped init containers).  
`docker:replyline:check:strict` is a release gate and fails for:

- floating/implicit-latest images;
- public binds on `langfuse-minio`/`qdrant`;
- missing env example template.

Expected one-shot `langfuse-minio-init` with `exited(0)` remains allowed.

## External compose responsibilities

External base compose (`REPLYLINE_AI_STACK_COMPOSE`, default `C:\Users\iurii\ai-stack\docker-compose.yml`) is not versioned in this repo.  
Repo can enforce override policy, checks, and templates; base-image pinning and inline secret cleanup in external file remain manual updates by environment owner.

## Danger zone (manual only)

Destructive commands are manual and require explicit confirmation:

- `docker compose down -v`
- `docker volume rm ...`
- `docker system prune ...`

These are intentionally not part of default Replyline scripts.
