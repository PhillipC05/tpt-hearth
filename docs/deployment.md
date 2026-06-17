# `tpt hearth` Deployment Guide

## Overview

This document covers deployment options for `tpt hearth`. The application is designed to run with SQLite for small communities, with a PostgreSQL upgrade path for scaling.

## Table of Contents

- [Local SQLite Run](#local-sqlite-run)
- [Environment Variables](#environment-variables)
- [Docker Compose (Postgres/Redis)](#docker-compose-postgresredis)
- [VPS Deployment](#vps-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [Render Deployment](#render-deployment)
- [SQLite Backup Guidance](#sqlite-backup-guidance)
- [Migration: SQLite to PostgreSQL](#migration-sqlite-to-postgresql)

---

## Local SQLite Run

The simplest way to run `tpt hearth` locally with SQLite. No Docker required.

### Prerequisites

- Node.js >= 18
- pnpm >= 10

### Steps

```sh
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Run database migrations
pnpm db:migrate

# 4. Start development servers (Next.js + WebSocket)
pnpm dev
```

The app will be available at:

| Service   | URL                         |
|-----------|-----------------------------|
| App       | http://localhost:3000       |
| WebSocket | ws://localhost:4000         |
| SQLite DB | `.data/hearth.sqlite`       |

### Production build (SQLite)

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start          # starts Next.js on port 3000
```

Run the WebSocket server separately in production:

```sh
pnpm --filter @tpt-hearth/web tsx src/server/ws.ts
```

Or use a process manager like `pm2`:

```sh
npm install -g pm2
pm2 start "pnpm start" --name "next"
pm2 start "pnpm --filter @tpt-hearth/web tsx src/server/ws.ts" --name "ws"
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Public URL of the Next.js app. Must match the deployed domain. |
| `NEXT_PUBLIC_WS_URL` | Yes | `ws://localhost:4000` | Public WebSocket URL. Use `wss://` in production. |
| `DATABASE_URL` | Yes | `file:.data/hearth.sqlite` | SQLite path or PostgreSQL connection string. |
| `NODE_ENV` | Yes | `development` | Set to `production` in deployed environments. |
| `AUTH_MODE` | Yes | `invite_code` | Authentication method: `invite_code`, `magic_link`, `username`, `oauth`, or `local_demo`. |
| `NEXT_PUBLIC_AUTH_MODE` | Yes | `invite_code` | Mirrors `AUTH_MODE` for client-side access. |
| `DEMO_AUTH_ALLOWED` | No | `true` | Allow demo auth mode for development. Disable in production. |
| `MAGIC_LINK_ALLOW_DEBUG_LINKS` | No | `true` | Allow debug magic links. Disable in production. |
| `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED` | No | `false` | Enable Google OAuth sign-in. |
| `OAUTH_GOOGLE_CLIENT_ID` | Conditional | — | Google OAuth client ID. Required if OAuth is enabled. |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Conditional | — | Google OAuth client secret. Required if OAuth is enabled. |
| `OAUTH_GOOGLE_REDIRECT_URI` | Conditional | `http://localhost:3000/api/auth/oauth/google/callback` | OAuth redirect URI. Must match Google Cloud Console. |

### Production checklist for env vars

- [ ] `NEXT_PUBLIC_APP_URL` uses `https://` in production
- [ ] `NEXT_PUBLIC_WS_URL` uses `wss://` in production
- [ ] `DATABASE_URL` points to the correct production database
- [ ] `NODE_ENV` is set to `production`
- [ ] `DEMO_AUTH_ALLOWED` is `false` in production (unless desired)
- [ ] `MAGIC_LINK_ALLOW_DEBUG_LINKS` is `false` in production
- [ ] OAuth secrets are stored securely (not committed to git)

---

## Docker Compose (Postgres/Redis)

Docker Compose is provided for teams that want to run PostgreSQL and Redis locally, or as a reference for production infrastructure.

> **Note:** SQLite remains the default for first-run development. Postgres/Redis are optional.

### Services

| Service    | Image              | Port  | Purpose                            |
|------------|--------------------|-------|------------------------------------|
| PostgreSQL | postgres:16-alpine | 5432  | Production-ready relational store  |
| Redis      | redis:7-alpine     | 6379  | Optional caching/pub-sub (future)  |

### Usage

```sh
# Start Postgres and Redis
docker compose up -d

# Verify they are running
docker compose ps

# Stop services
docker compose down

# Stop and remove volumes (destroys data)
docker compose down -v
```

### Connecting the app to Docker services

Set these environment variables when using Docker Compose:

```env
DATABASE_URL=postgresql://hearth:hearth@localhost:5432/tpt_hearth
```

---

## VPS Deployment

Deploy to a virtual private server (e.g., DigitalOcean Droplet, Linode, Hetzner, AWS EC2).

### Requirements

- Linux (Ubuntu 22.04+ recommended)
- Node.js 18+ and pnpm installed
- Reverse proxy (Caddy or Nginx)
- (Optional) Process manager: `pm2`
- (Optional) Postgres client for migration

### Setup steps

```sh
# 1. Install Node.js and pnpm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pnpm pm2

# 2. Clone the repository
git clone https://github.com/PhillipC05/tpt-hearth.git
cd tpt-hearth

# 3. Install and build
pnpm install --frozen-lockfile
pnpm build

# 4. Configure environment
cp .env.example .env
# Edit .env — set NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_WS_URL, DATABASE_URL, NODE_ENV=production

# 5. Run database migrations
pnpm db:migrate

# 6. Start with pm2
pm2 start "pnpm start" --name "tpt-hearth-next"
pm2 start "pnpm --filter @tpt-hearth/web tsx src/server/ws.ts" --name "tpt-hearth-ws"
pm2 save
pm2 startup
```

### Reverse proxy with Caddy

Create `/etc/caddy/Caddyfile`:

```caddy
yourdomain.com {
    reverse_proxy localhost:3000
}

ws.yourdomain.com {
    reverse_proxy localhost:4000
}
```

### Reverse proxy with Nginx

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl;
    server_name ws.yourdomain.com;

    ssl_certificate /etc/ssl/certs/yourdomain.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.key;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SQLite on VPS

If using SQLite in production:

- Store the database outside the app directory (e.g., `/var/data/hearth.sqlite`)
- Set `DATABASE_URL=file:/var/data/hearth.sqlite`
- Ensure the app user has write permissions to the directory
- Set up automated backups (see [SQLite Backup](#sqlite-backup-guidance))

---

## Fly.io Deployment

Fly.io is a good fit for this app because it supports:
- Global regions
- Attached volumes for SQLite persistence
- Simple Dockerfile-less deploys

### Prerequisites

```sh
# Install flyctl
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Setup

```sh
# 1. Launch the app
fly launch --no-deploy

# 2. Create a volume for SQLite
fly volumes create hearth_data --region iad --size 1

# 3. Configure fly.toml
```

Example `fly.toml`:

```toml
app = "tpt-hearth"
primary_region = "iad"

[build]
  builder = "heroku/buildpacks:20"
  buildpacks = ["https://github.com/heroku/heroku-buildpack-nodejs"]

[env]
  NODE_ENV = "production"
  NEXT_PUBLIC_APP_URL = "https://tpt-hearth.fly.dev"
  NEXT_PUBLIC_WS_URL = "wss://tpt-hearth.fly.dev/ws"
  DATABASE_URL = "file:/data/hearth.sqlite"

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.ports]]
    handlers = ["http"]
    port = 4000

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "5s"
    grace_period = "30s"

[[mounts]]
  source = "hearth_data"
  destination = "/data"
```

```sh
# 4. Deploy
fly deploy

# 5. Run migrations
fly ssh console -C "cd /app && pnpm db:migrate"
```

### Important Fly.io notes

- The `mounts` section attaches the volume to `/data`, where SQLite is stored
- Use a single VM instance (SQLite doesn't support multi-writer)
- Scale memory with `fly scale memory 512` (512MB minimum recommended)
- WebSocket runs on port 4000 — configure routing to share the same domain

---

## Render Deployment

Render supports Node.js web services with disk persistence.

### Setup

1. Create a new **Web Service** on Render
2. Connect your repository
3. Use the following settings:

| Setting | Value |
|---|---|
| **Name** | `tpt-hearth` |
| **Runtime** | Node |
| **Build Command** | `pnpm install --frozen-lockfile && pnpm build` |
| **Start Command** | `pnpm start & pnpm --filter @tpt-hearth/web tsx src/server/ws.ts` |
| **Plan** | Starter or higher (needs disk) |

4. Add a **Disk** (Render persistent disk):
   - Mount path: `/data`
   - Size: 1 GB (sufficient for small communities)

5. Set environment variables in the Render dashboard:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tpt-hearth.onrender.com
NEXT_PUBLIC_WS_URL=wss://tpt-hearth.onrender.com
DATABASE_URL=file:/data/hearth.sqlite
AUTH_MODE=invite_code
NEXT_PUBLIC_AUTH_MODE=invite_code
DEMO_AUTH_ALLOWED=false
MAGIC_LINK_ALLOW_DEBUG_LINKS=false
```

### Important Render notes

- SQLite requires **persistent disk** — data is lost on redeploy without it
- The start command runs both Next.js and WebSocket in a single container via `&`
- For better reliability, consider upgrading to a paid plan with higher uptime guarantees
- WebSocket connections may timeout after 60s of inactivity on free plans

---

## SQLite Backup Guidance

If running SQLite in production, regular backups are essential.

### Manual backup

```sh
# Backup using sqlite3 .backup command
sqlite3 .data/hearth.sqlite ".backup /backup/hearth-$(date +%Y%m%d-%H%M%S).sqlite"

# Or use file copy (SQLite safe if no writes during copy)
cp .data/hearth.sqlite /backup/hearth-backup.sqlite
```

### Automated backup script

Create `scripts/backup.sh`:

```sh
#!/bin/bash
# SQLite backup script
# Usage: ./scripts/backup.sh /path/to/database.sqlite /path/to/backup/dir

DB_PATH="${1:-.data/hearth.sqlite}"
BACKUP_DIR="${2:-/backup}"
RETENTION_DAYS="${3:-30}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hearth-${TIMESTAMP}.sqlite"

mkdir -p "$BACKUP_DIR"

# Use .backup for safe online backups
sqlite3 "$DB_PATH" ".backup '${BACKUP_FILE}'"

# Compress
gzip "$BACKUP_FILE"

# Remove backups older than retention period
find "$BACKUP_DIR" -name "hearth-*.sqlite.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup saved: ${BACKUP_FILE}.gz"
```

Add a cron job:

```sh
# Backup daily at 3 AM
0 3 * * * /path/to/tpt-hearth/scripts/backup.sh /var/data/hearth.sqlite /var/backups 30
```

### Restore from backup

```sh
gunzip -c /backup/hearth-20240617-030000.sqlite.gz > /tmp/restored.sqlite
# Stop the app
# Replace the database file
cp /tmp/restored.sqlite /var/data/hearth.sqlite
# Restart the app
```

### Backup checklist

- [ ] Automated daily backups configured
- [ ] Backups stored on a separate volume or remote location
- [ ] Retention policy defined (e.g., 30 days)
- [ ] Restore procedure tested regularly
- [ ] Backup monitoring/alerting in place
- [ ] Encryption for off-site backups (if sensitive data)

---

## Migration: SQLite to PostgreSQL

### When to migrate

- Community grows beyond ~100 active users
- Need for concurrent writes or read replicas
- Geographically distributed users requiring low-latency reads
- Need for more sophisticated backup/point-in-time recovery

### Prerequisites

- PostgreSQL 16+ running (use `docker compose up -d` locally)
- `pgloader` or similar migration tool
- Drizzle Kit configured for PostgreSQL

### Step 1: Export SQLite data

```sh
# Dump SQLite data to SQL
sqlite3 .data/hearth.sqlite .dump > /tmp/hearth-dump.sql
```

### Step 2: Set up PostgreSQL

```env
# Update .env
DATABASE_URL=postgresql://hearth:hearth@localhost:5432/tpt_hearth
```

Update `packages/db/drizzle.config.ts` to use PostgreSQL driver if needed.

### Step 3: Create PostgreSQL schema

```sh
# Generate PostgreSQL-compatible migrations
pnpm db:generate

# Run migrations on PostgreSQL
pnpm db:migrate
```

### Step 4: Migrate data with pgloader

Install pgloader:

```sh
# macOS
brew install pgloader

# Ubuntu
sudo apt-get install pgloader
```

Create a migration file `sqlite-to-pg.load`:

```lisp
LOAD DATABASE
     FROM sqlite:///.data/hearth.sqlite
     INTO postgresql://hearth:hearth@localhost:5432/tpt_hearth

WITH include no drop, create tables, create indexes, reset sequences,
     batch rows = 1000, batch concurrency = 1

SET maintenance_work_mem to '128MB',
    work_mem to '12MB'

CAST type datetime to timestamptz drop default drop not null using zero-dates-to-null,
     type date to date drop default drop not null using zero-dates-to-null;
```

Run the migration:

```sh
pgloader sqlite-to-pg.load
```

### Step 5: Verify and clean up

```sh
# Check row counts
psql postgresql://hearth:hearth@localhost:5432/tpt_hearth -c "SELECT count(*) FROM users;"
psql postgresql://hearth:hearth@localhost:5432/tpt_hearth -c "SELECT count(*) FROM rooms;"

# Verify data integrity
# Test the application against the new database
```

### Step 6: Manual data migration (alternative)

If pgloader isn't suitable, write a custom migration script:

```ts
// scripts/migrate-sqlite-to-postgres.ts
import { db as sqliteDb } from '@tpt-hearth/db';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const pgClient = postgres(process.env.DATABASE_URL!);
const pgDb = drizzle(pgClient);

async function migrate() {
  // 1. Migrate users
  const users = await sqliteDb.select().from(sqliteTables.users);
  for (const user of users) {
    await pgDb.insert(pgTables.users).values(user).onConflictDoNothing();
  }

  // 2. Migrate rooms
  const rooms = await sqliteDb.select().from(sqliteTables.rooms);
  for (const room of rooms) {
    await pgDb.insert(pgTables.rooms).values(room).onConflictDoNothing();
  }

  // 3. Migrate messages (skip private-room ciphertext)
  const messages = await sqliteDb.select().from(sqliteTables.messages);
  for (const msg of messages) {
    await pgDb.insert(pgTables.messages).values(msg).onConflictDoNothing();
  }

  // 4. Continue for all other tables...
  // See packages/db/POSTGRES_PARITY.md for the full table list
}

migrate()
  .then(() => { console.log('Migration complete'); process.exit(0); })
  .catch((e) => { console.error('Migration failed:', e); process.exit(1); });
```

### Post-migration checklist

- [ ] All data migrated (run row-count comparisons)
- [ ] Indexes created on PostgreSQL
- [ ] Application configured with `DATABASE_URL` pointing to PostgreSQL
- [ ] WebSocket connections tested
- [ ] Auth flows (sign-up, sign-in, magic link, OAuth) verified
- [ ] Search functionality verified in Grove
- [ ] Porch session creation/joining works
- [ ] Private room message encryption and decryption works
- [ ] Backup strategy updated for PostgreSQL (pg_dump)
- [ ] Monitoring configured for PostgreSQL (connection pool, slow queries)
- [ ] Rollback plan documented in case of issues

### Rollback

If PostgreSQL migration has issues, revert to SQLite:

```sh
# Point DATABASE_URL back to SQLite
DATABASE_URL=file:.data/hearth.sqlite

# Restart the application
pnpm build && pnpm start
```

The old SQLite database remains untouched during migration, so rollback is simply a config change.

---

## Production readiness checklist

- [ ] All environment variables set correctly
- [ ] `NODE_ENV=production`
- [ ] SQLite backups configured (or PostgreSQL with pg_dump)
- [ ] WebSocket server running as a managed process
- [ ] Reverse proxy configured with TLS/SSL
- [ ] Database migrations run on deploy
- [ ] Regular backup verification (test a restore)
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting considered for auth endpoints
- [ ] Monitoring and alerting set up
- [ ] Incident response plan documented