# `tpt hearth` Runbook

## Local run without Docker

```sh
pnpm install
pnpm dev
```

Open:

```txt
http://localhost:3000
```

The WebSocket server runs on:

```txt
ws://localhost:4000
```

SQLite is created automatically at:

```txt
.data/hearth.sqlite
```

## Environment

Copy `.env.example` to `.env`:

```sh
cp .env.example .env
```

Recommended local values:

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
DATABASE_URL=file:.data/hearth.sqlite
NODE_ENV=development
```

## Development scripts

```sh
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:e2e
pnpm db:generate
pnpm db:migrate
```

## Docker Compose

Docker Compose is included for teams that prefer containerized local services.

SQLite remains the default for the first working demo.

PostgreSQL/Redis are prepared for later production scaling.

## Useful commands

```sh
pnpm --filter @tpt-hearth/web dev
pnpm --filter @tpt-hearth/db generate
pnpm --filter @tpt-hearth/db migrate
pnpm --filter @tpt-hearth/web test
pnpm --filter @tpt-hearth/web test:e2e
```

## Deployment

See the comprehensive deployment guide:

📄 **[docs/deployment.md](./deployment.md)**

Covers:

| Topic | Details |
|---|---|
| **Local SQLite run** | Production build, process management with pm2 |
| **Environment variables** | Full reference table and production checklist |
| **Docker Compose** | Optional Postgres/Redis stack usage |
| **VPS deployment** | Ubuntu setup, Caddy/Nginx reverse proxy |
| **Fly.io deployment** | fly.toml config, volumes, migrations |
| **Render deployment** | Web service setup, persistent disk |
| **SQLite backup** | Manual, automated (cron), restore guidance |
| **SQLite → Postgres migration** | pgloader, custom script, rollback plan |
| **Production readiness** | Full deployment checklist |

## Safety checklist before real users

- Confirm private-room plaintext is never stored server-side.
- Confirm open-room moderation rules are visible.
- Confirm account deletion works.
- Confirm data export works.
- Confirm notifications are disabled by default.
- Confirm no analytics/tracking pixels are installed.
- Confirm no likes, shares, follower counts, or algorithmic feeds exist.