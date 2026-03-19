# Sidekicks

Sidekicks is a control plane for deploying and managing agent runtimes like apps.

The current MVP keeps the existing Next.js UI as the product surface and layers a queue-ready service architecture underneath it:

- Control plane:
  Next.js app, internal API routes, orchestration services, dashboard, templates, agents, runs, artifacts, settings
- Execution plane:
  BullMQ-backed worker service intended to consume queued runs and execute runtime-backed templates

## Current MVP status

Implemented:

- runtime-backed template registry (`OpenClaw`, `NanoClaw`, `AppClaw`, `MarketingClaw`, `DataClaw`)
- deploy agent flow
- agents list and agent detail page
- create job flow
- run lifecycle simulation (`queued -> running -> completed/failed`)
- run detail with logs, steps, output
- artifacts list connected to runs
- settings workspace for LLM profiles and control-plane defaults
- Postgres-backed control-plane repository path
- Redis/BullMQ queue handoff for run execution
- worker process that consumes queued runs and updates run/job/artifact state

Still mocked or simplified:

- actual runtime containers and sandbox isolation
- artifact upload to MinIO/S3
- Python worker path
- local non-Compose development still defaults to in-memory mode

## Local architecture

The repo is organized to map to the eventual Hetzner topology:

- `app/`
  Next.js routes and API handlers
- `components/`
  product UI
- `lib/domain/`
  centralized typed control-plane model
- `lib/server/`
  seed state, memory store, Postgres store, presenters, services, queue contracts
- `worker/`
  execution-plane BullMQ worker

## Hetzner deployment model

Target topology:

- control-node
  - web app / API
  - Postgres
  - Redis
  - reverse proxy
  - optional MinIO or external S3-compatible provider
- worker-node
  - worker service
  - runtime containers or subprocess workers later

The repo now supports two modes:

- default local app mode:
  in-memory control-plane state for fast UI iteration
- Compose / Hetzner-like mode:
  Postgres persistence + Redis/BullMQ queue + separate worker process

## Docker Compose

For local topology that mirrors the control-node/worker-node split:

```bash
docker compose up --build
```

Services:

- `web`
- `worker`
- `postgres`
- `redis`
- `minio`

Useful endpoints:

- App: `http://localhost:3000`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`

## Local development

```bash
npm install
npm run dev
```

That starts the app in the default in-memory mode. To run against the real MVP control-plane services locally, use Compose.

To run the worker locally against Postgres/Redis:

```bash
npm run worker
```

## Next infrastructure steps

1. Move artifact handling from metadata-only records to real MinIO/S3 upload/download.
2. Split runtime execution by template/runtime type instead of a single simulated worker path.
3. Add a Python worker/runtime adapter for `DataClaw`.
4. Introduce migrations and repository modules instead of bootstrap DDL in app code.
