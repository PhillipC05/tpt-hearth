# `tpt hearth` Implementation Todo

This todo reflects the confirmed MVP: a fully functional web/PWA monorepo with Hearth, Porch, Embers, Grove, Letters, Chronicles, Rituals, auth, moderation, admin, export/delete, PWA, SQLite, WebSocket chat, and private-room E2E encryption.

---

## 0. Project Foundation

- [x] Read `1.txt` product context.
- [x] Clarify MVP scope and technical decisions.
- [x] Create `SPEC.md`.
- [x] Create root monorepo files:
  - [x] `package.json`
  - [x] `pnpm-workspace.yaml`
  - [x] `turbo.json`
  - [x] `tsconfig.base.json`
  - [x] `.gitignore`
  - [x] `.env.example`
  - [x] `README.md`
- [x] Create docs:
  - [x] `docs/architecture.md`
  - [x] `docs/database.md`
  - [x] `docs/encryption.md`
  - [x] `docs/moderation.md`
  - [x] `docs/pwa.md`
  - [x] `docs/runbook.md`

---

## 1. Monorepo Packages

### `packages/config`

- [x] Add package metadata.
- [x] Export environment helpers.
- [x] Export app constants:
  - room capacity: `12`
  - default WebSocket port: `4000`
  - default database path: `.data/hearth.sqlite`
  - brand colors
  - auth modes
  - room visibility modes
  - room privacy modes

### `packages/shared`

- [x] Add shared TypeScript types:
  - User
  - Session
  - Room
  - Message
  - PorchSession
  - Letter
  - Chronicle
  - Ritual
  - Report
  - ModerationAction
  - TransparencyLog
  - ServerSettings
- [x] Add shared validation helpers.
- [x] Add API response type helpers.

### `packages/db`

- [x] Add package metadata.
- [x] Add Drizzle SQLite schema.
- [x] Add database connection helper.
- [x] Add `ensureSchema()` table creation.
- [x] Add seed helper for local demo data.
- [x] Add PostgreSQL schema parity notes.
- [x] Add Drizzle Kit config.

### `packages/crypto`

- [x] Add package metadata.
- [x] Add Web Crypto room key generation.
- [x] Add message encryption/decryption.
- [x] Add key export/import helpers.
- [x] Add encrypted draft storage helpers.
- [x] Add browser-safe E2E utilities.

### `packages/ui`

- [x] Add package metadata.
- [x] Add Button component.
- [x] Add Card component.
- [x] Add Input component.
- [x] Add Textarea component.
- [x] Add Badge component.
- [x] Add Dialog component.
- [x] Add Select component.
- [x] Add Label component.
- [x] Add cn helper.

---

## 2. Web App Shell

### App structure

- [x] Create `apps/web/package.json`.
- [x] Create `apps/web/tsconfig.json`.
- [x] Create `apps/web/next.config.ts`.
- [x] Create `apps/web/tailwind.config.ts`.
- [x] Create `apps/web/postcss.config.mjs`.
- [x] Create `apps/web/components.json`.
- [x] Create `apps/web/app/layout.tsx`.
- [x] Create `apps/web/app/globals.css`.
- [x] Create `apps/web/public/manifest.webmanifest`.
- [x] Create `apps/web/public/sw.js`.
- [x] Create `apps/web/public/icon.svg`.

### Brand/design system

- [x] Add EB Garamond and Inter fonts.
- [x] Add warm dark theme tokens.
- [x] Add exact brand colors:
  - Ember Orange `#D46A2E`
  - Ash Gray `#2C2C2E`
  - Warm Sand `#E8DCC4`
  - Deep Pine `#1A2F1A`
- [x] Add slow fade and ember glow animation utilities.
- [x] Add calm spacing and typography rules.

### Layout/components

- [x] Create `LodgeNav`.
- [x] Create `AppShell`.
- [x] Create `PwaProvider`.
- [x] Create `AuthSessionProvider`.
- [x] Create `RoomCard`.
- [x] Create `PresenceIndicator`.
- [x] Create `MoodPill`.
- [x] Create `GentleEmptyState`.

---

## 3. Auth

- [x] Implement demo auth API route.
- [x] Implement invite-code auth API route.
- [x] Implement magic-link request API route.
- [x] Implement magic-link confirm API route.
- [x] Implement username auth API route.
- [x] Scaffold OAuth route behind config.
- [x] Implement local/offline demo account mode.
- [x] Store session token safely in localStorage for MVP.
- [x] Add `AuthForm`.
- [x] Add `AuthSessionProvider`.
- [x] Add auth page at `/auth`.

---

## 4. Database and API

### API helpers

- [ ] Create `apps/web/src/lib/api.ts`.
- [ ] Add typed fetch wrapper.
- [ ] Add session token injection.
- [ ] Add error normalization.

### Rooms

- [ ] Add `GET /api/rooms`.
- [ ] Add `POST /api/rooms`.
- [ ] Add `GET /api/rooms/[roomId]`.
- [ ] Add `PATCH /api/rooms/[roomId]`.
- [ ] Add `POST /api/rooms/[roomId]/archive`.
- [ ] Add `POST /api/rooms/[roomId]/members`.
- [ ] Add `DELETE /api/rooms/[roomId]/members/[userId]`.

### Messages

- [ ] Add `GET /api/rooms/[roomId]/messages`.
- [ ] Add `POST /api/messages`.
- [ ] Store plaintext for open rooms.
- [ ] Store ciphertext for private rooms.
- [ ] Add message deletion/soft-archive support.

### Porch

- [ ] Add `GET /api/porch/sessions`.
- [ ] Add `POST /api/porch/sessions`.
- [ ] Add `POST /api/porch/sessions/[sessionId]/join`.
- [ ] Add `POST /api/porch/sessions/[sessionId]/extend`.
- [ ] Add `POST /api/porch/sessions/[sessionId]/leave`.
- [ ] Add `POST /api/porch/sessions/[sessionId]/exchange-embers`.

### Grove

- [ ] Add `GET /api/grove`.
- [ ] Filter only open-directory rooms.
- [ ] Search by mood/topic/name.
- [ ] Avoid ranking or popularity signals.

### Letters

- [ ] Add `GET /api/letters`.
- [ ] Add `POST /api/letters`.
- [ ] Add `GET /api/letters/[letterId]`.
- [ ] Add delivery window support.
- [ ] Add Markdown export support.

### Chronicles

- [ ] Add `GET /api/chronicles`.
- [ ] Add `POST /api/chronicles`.
- [ ] Add `PATCH /api/chronicles/[chronicleId]`.
- [ ] Add `DELETE /api/chronicles/[chronicleId]`.

### Rituals

- [x] Add `GET /api/rituals`.
- [x] Add `POST /api/rituals`.
- [x] Add `PATCH /api/rituals/[ritualId]`.
- [x] Add `POST /api/rituals/[ritualId]/summary`.

### Export/delete

- [x] Add `POST /api/export/json`.
- [x] Add `POST /api/export/markdown`.
- [x] Add `POST /api/account/delete`.
- [x] Ensure deletion removes user-owned data where possible.

---

## 5. Real-Time WebSocket Layer

- [ ] Create native WebSocket server.
- [ ] Run WebSocket server alongside Next.js in dev.
- [ ] Add WebSocket client helper.
- [ ] Support events:
  - `join_room`
  - `leave_room`
  - `message`
  - `presence`
  - `typing`
  - `room_state`
  - `error`
- [ ] Enforce 12 active participant cap.
- [ ] Broadcast presence and typing softly.
- [ ] Keep WebSocket protocol simple and replaceable.

---

## 6. Feature Pages

### Hearth

- [ ] Create `/hearth`.
- [ ] Show user's active rooms.
- [ ] Add create room form.
- [ ] Create `/hearth/[roomId]`.
- [ ] Add linear chat UI.
- [ ] Add room rules.
- [ ] Add steward controls.
- [ ] Add manual archive action.
- [ ] Add subtle presence indicators.

### Porch

- [ ] Create `/porch`.
- [ ] Add `Sit for a while` action.
- [ ] Add 20-minute session timer.
- [ ] Add `Stay longer`.
- [ ] Add `Exchange embers`.
- [ ] Add `Step away`.
- [ ] Support admin-configurable matching mode.

### Embers

- [ ] Create `/embers`.
- [ ] Add ambient mood rooms.
- [ ] Add optional audio loop selector.
- [ ] Add optional fireplace/visual selector.
- [ ] Add quiet chat/presence UI.

### Grove

- [ ] Create `/grove`.
- [ ] Add search by mood/topic/name.
- [ ] Show only open-directory rooms.
- [ ] Avoid ranking, popularity, or algorithmic ordering.

### Letters

- [ ] Create `/letters`.
- [ ] Add inbox/list view.
- [ ] Add long-form composer.
- [ ] Add individual and room recipient selection.
- [ ] Add delivery window selector.

### Chronicles

- [ ] Create `/chronicles`.
- [ ] Add private archive UI.
- [ ] Add rooms inhabited.
- [ ] Add letters kept.
- [ ] Add ritual summaries.
- [ ] Add personal notes.

### Rituals

- [ ] Create `/rituals`.
- [ ] Add upcoming/past ritual lists.
- [ ] Add create ritual form.
- [ ] Add gentle summary for missed rituals.

### Admin

- [ ] Create `/admin`.
- [ ] Add Porch mode selector.
- [ ] Add room policy controls.
- [ ] Add invite management.
- [ ] Add moderation log viewer.
- [ ] Add server settings.
- [ ] Add demo seed action.

---

## 7. Moderation

- [ ] Add report creation.
- [ ] Add steward mute action.
- [ ] Add steward ban action.
- [ ] Add room-level rules editing.
- [ ] Add transparency log display.
- [ ] Ensure private E2E message contents are not visible to server/admin.
- [ ] Allow moderation of metadata, reports, and open-room content.

---

## 8. PWA and Offline

- [ ] Add manifest.
- [ ] Add service worker.
- [ ] Register service worker.
- [ ] Cache app shell.
- [ ] Add install prompt UI.
- [ ] Add local encrypted draft storage.
- [ ] Prepare push notification permission flow, disabled by default.

---

## 9. Testing

### Unit tests

- [ ] Test room validation.
- [ ] Test privacy/visibility mode validation.
- [ ] Test crypto encrypt/decrypt round trip.
- [ ] Test encrypted draft encode/decode.

### Integration tests

- [ ] Test demo auth.
- [ ] Test room creation.
- [ ] Test message persistence.
- [ ] Test Porch session creation.
- [ ] Test data export.

### E2E tests

- [ ] Test login flow.
- [ ] Test Hearth room chat.
- [ ] Test Porch session flow.
- [ ] Test Grove search.
- [ ] Test PWA shell loads offline after cache.

---

## 10. Deployment and Operations

- [ ] Add Docker Compose for optional Postgres/Redis future stack.
- [ ] Add local SQLite run instructions.
- [ ] Add environment variable documentation.
- [ ] Add VPS deployment notes.
- [ ] Add Fly.io/Render deployment notes.
- [ ] Add backup guidance for SQLite.
- [ ] Add migration guidance from SQLite to Postgres.

---

## 11. Acceptance Criteria

The scaffold is successful when:

- [x] `pnpm install` works.
- [x] `pnpm typecheck` passes.
- [ ] `pnpm dev` starts the Next.js app and WebSocket server.
- [ ] The app is reachable locally without Docker.
- [ ] SQLite database initializes automatically.
- [ ] Demo auth works.
- [ ] Hearth rooms can be created and joined.
- [ ] WebSocket chat works in a room.
- [ ] Porch sessions can be created and extended.
- [ ] Embers spaces are functional.
- [ ] Grove lists open rooms.
- [ ] Letters can be written.
- [ ] Chronicles can store private notes.
- [ ] Rituals can be created and summarized.
- [ ] Moderation reports/actions/logs exist.
- [ ] Admin controls exist.
- [ ] JSON/Markdown export works.
- [ ] Account deletion works.
- [ ] PWA install/offline shell works.
- [ ] Private rooms use E2E encryption.
- [ ] Open rooms use plaintext storage.
- [ ] Unit, integration, and E2E tests are present.