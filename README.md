# `tpt hearth`

**A calm web/PWA social platform for presence, conversation, and human bonds.**

Built by [TPT Solutions](https://github.com/tpt-solutions).

`tpt hearth` is not optimized for growth, productivity, virality, or attention capture. It is a digital lodge: a place to sit, speak gently, and be together without performance pressure.

*Come sit. Stay awhile. Just be.*

---

## Features

- **Hearth** — intimate persistent chat rooms capped at 12 people
- **Porch** — 20-minute low-friction sessions for meeting new people
- **Embers** — ambient co-presence spaces with optional audio atmosphere
- **Grove** — open room directory searchable by mood and topic
- **Letters** — asynchronous long-form messages with scheduled delivery
- **Chronicles** — private personal archives, exportable as JSON/Markdown
- **Rituals** — optional user-hosted gatherings with gentle summaries
- **E2E Encryption** — private rooms use AES-256-GCM via the Web Crypto API
- **PWA** — installable, offline-capable shell with encrypted draft storage
- **Real-time presence** — native WebSocket server for chat and typing indicators
- **Admin controls** — invite management, moderation, and server settings
- **Data portability** — full JSON/Markdown export and instant account deletion

## What this platform rejects

- Algorithmic feeds or recommendation engines
- Likes, shares, follower counts, and virality metrics
- Infinite scrolling and engagement-optimized UI
- Ads, tracking pixels, and behavioral analytics
- Red notification badges and urgency language

---

## Stack

| Layer | Technology |
|---|---|
| Web framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | shadcn/ui-style primitives |
| Database | SQLite (Drizzle ORM), PostgreSQL upgrade path |
| Real-time | Native WebSockets |
| Encryption | Web Crypto API (AES-256-GCM, PBKDF2) |
| PWA | Manifest + Service Worker |
| Monorepo | pnpm workspaces + Turborepo |

---

## Quick start

```sh
git clone https://github.com/tpt-solutions/tpt-hearth.git
cd tpt-hearth
pnpm install
cp .env.example .env
pnpm dev
```

| Service | URL |
|---|---|
| Web app | http://localhost:3000 |
| WebSocket server | ws://localhost:4000 |
| SQLite database | `.data/hearth.sqlite` |

---

## Environment

Copy the example environment file and edit as needed:

```sh
cp .env.example .env
```

Key variables:

```txt
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
DATABASE_URL=file:.data/hearth.sqlite
NODE_ENV=development
```

See [`.env.example`](./.env.example) for the full reference.

---

## Scripts

```sh
pnpm dev           # Start development server
pnpm build         # Production build
pnpm lint          # Run ESLint
pnpm test          # Unit tests (vitest)
pnpm test:e2e      # End-to-end tests (Playwright)
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Run migrations
```

---

## Documentation

| Document | Description |
|---|---|
| [SPEC.md](./SPEC.md) | Full product specification |
| [docs/architecture.md](./docs/architecture.md) | System design and component overview |
| [docs/database.md](./docs/database.md) | Schema and relationships |
| [docs/encryption.md](./docs/encryption.md) | E2E encryption design |
| [docs/moderation.md](./docs/moderation.md) | Moderation workflow |
| [docs/pwa.md](./docs/pwa.md) | PWA implementation notes |
| [docs/deployment.md](./docs/deployment.md) | Deployment guide (local, Docker, VPS, Fly.io) |
| [docs/runbook.md](./docs/runbook.md) | Day-to-day operations runbook |

---

## Admin setup

The first admin user must be set directly in the database:

```sh
# Using the SQLite CLI
sqlite3 .data/hearth.sqlite \
  "UPDATE users SET is_admin = 1 WHERE handle = 'your-handle';"
```

From there, admin users can manage invites, moderation, and server settings through the `/admin` interface.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Read [SPEC.md](./SPEC.md) first — contributions must align with the product vision.

---

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

Copyright 2024 TPT Solutions.
