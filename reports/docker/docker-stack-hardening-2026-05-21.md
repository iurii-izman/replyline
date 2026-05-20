# Docker Stack Hardening - 2026-05-21

## Scope

- Repository: `iurii-izman/replyline`
- Mode: direct changes in `main` (no PR)
- Non-goals: no Docker architecture rewrite, no new services, no volume/data deletion

## Repo vs external map

- Repo-owned:
  - `infra/replyline-ai-stack.override.yml` (labels + port policy)
  - `scripts/docker-replyline-health.ps1` (health/recovery/reporting)
  - `docs/docker-stack.md` (runbook/policy)
  - `.env.docker.example` (sanitized env contract)
  - `infra/replyline-ai-stack.pinned.example.yml` (pinning overlay example)
- External-only:
  - Base compose from `REPLYLINE_AI_STACK_COMPOSE` (default `C:\Users\iurii\ai-stack\docker-compose.yml`)
  - Real secrets and exact base image pins when declared only in external compose

## Hardening changes

1. Port exposure defaults hardened to local-only in override:
   - `langfuse-web`: `127.0.0.1:13000:3000`
   - `langfuse-minio`: `127.0.0.1:19090:9000`
   - `qdrant`: `127.0.0.1:16333:6333`, `127.0.0.1:16334:6334`
2. Added sanitized env contract:
   - `.env.docker.example`
3. Added release pinning template:
   - `infra/replyline-ai-stack.pinned.example.yml`
4. Health script hardening:
   - warnings: `floatingImageTags`, `majorOnlyImageTags`, `publicPortBindings`, `missingEnvExample`, `experimentalServicesRunning`, `exitedExpected`, `externalComposeSecretsInline`
   - strict mode: `-StrictRelease`
   - strict failures: floating/implicit-latest images, public bind for MinIO/Qdrant, missing env template
5. Added package command:
   - `pnpm docker:replyline:check:strict`

## External manual actions still required

- If base compose keeps floating or implicit-latest images, owner must pin tested tags/digests in external compose or via local pinned overlay.
- If external compose contains inline credentials, owner must move them to local env/secret management.

## Safety statement

- No `docker compose down -v`
- No `docker system prune`
- No volume deletion commands
