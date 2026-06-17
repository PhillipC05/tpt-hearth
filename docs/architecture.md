# `tpt hearth` Architecture Notes

## Goal

Build a calm, non-extractive social platform as a web/PWA monorepo. The first working demo includes all major product areas: Hearth, Porch, Embers, Grove, Letters, Chronicles, Rituals, auth, moderation, admin, export/delete, PWA shell, SQLite persistence, WebSocket realtime, and private-room E2E encryption.

## Monorepo

```txt
apps/
  web/
packages/
  config/
  shared/
  db/
  crypto/
  ui/
docs/
SPEC.md
todo.md
```

## Runtime

- Next.js App Router serves the web/PWA.
- SQLite stores structured data by default.
- A native WebSocket server handles realtime room events.
- PostgreSQL is the future production database path.
- Redis is not required for the first working demo.

## Data boundaries

### Server-stored plaintext

Used for open rooms.

Allows:

- Grove search
- moderation review
- continuity across devices
- export from server-side data

### Client-side E2E ciphertext

Used for private rooms.

The server stores:

- message metadata
- ciphertext
- nonce/IV
- key version
- sender/receiver room membership metadata

The server does not store plaintext private-room message contents.

## App layers

### `packages/config`

Environment and constants:

- room capacity: 12
- default WebSocket port: 4000
- database path
- brand colors
- auth modes
- visibility modes
- privacy modes

### `packages/shared`

TypeScript types and validation helpers used by web, API, and tests.

### `packages/db`

Drizzle schema and SQLite connection helpers.

The same domain model should remain portable to PostgreSQL.

### `packages/crypto`

Browser-safe Web Crypto helpers:

- room key generation
- message encryption/decryption
- key export/import
- encrypted local draft storage

### `packages/ui`

Reusable UI primitives:

- Button
- Card
- Input
- Textarea
- Badge
- Dialog
- Select
- Label
- `cn` helper

### `apps/web`

Next.js app, API routes, feature pages, realtime client, PWA service worker registration.

## Routes

```txt
/
/auth

/hearth
/hearth/[roomId]
/porch
/embers
/grove
/letters
/chronicles
/rituals
/admin
```

## Realtime events

```ts
type ClientEvent =
  | { type: "join_room"; roomId: string; userId: string }
  | { type: "leave_room"; roomId: string; userId: string }
  | { type: "message"; roomId: string; userId: string; body: string; privacyMode: "private_e2e" | "open_plaintext" }
  | { type: "presence"; roomId: string; userId: string; state: "present" | "away" }
  | { type: "typing"; roomId: string; userId: string; isTyping: boolean };

type ServerEvent =
  | { type: "room_state"; roomId: string; participants: string[] }
  | { type: "message"; roomId: string; message: unknown }
  | { type: "presence"; roomId: string; participants: string[] }
  | { type: "typing"; roomId: string; userId: string; isTyping: boolean }
  | { type: "error"; code: string; message: string };
```

## Design principles

- No algorithmic ranking.
- No likes, shares, follower counts, or virality.
- No infinite scroll.
- No red notification badges.
- No urgency language.
- No productivity framing.
- No public broadcasting as the default social mode.

## Future evolution

After the full scaffold is functional:

1. Replace local WebSocket server with distributed realtime infrastructure.
2. Add voice presence.
3. Add federation protocol.
4. Add self-hosted nodes.
5. Add mobile apps.
6. Improve group E2E key rotation.