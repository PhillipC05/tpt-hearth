# `tpt hearth` Product Specification

**Version:** 1.0  
**Status:** Scaffold-ready  
**MVP target:** Fully functional web/PWA monorepo with all major product areas included.

---

## 1. Vision

`tpt hearth` is a digital third place: a quiet, intimate, non-extractive social platform designed for presence, conversation, and human bonds.

It is not optimized for growth, productivity, virality, metrics, or attention capture. It is designed to help people sit together, speak gently, and remain connected without performance pressure.

**Mantra:** *Come sit. Stay awhile. Just be.*

---

## 2. Non-Negotiable Product Principles

`tpt hearth` permanently rejects:

- Algorithmic feeds or recommendation engines
- Follower counts, likes, shares, reposts, or virality metrics
- Infinite scrolling or engagement-optimized UI
- Ads, tracking pixels, behavioral analytics, or VC-style growth mandates
- Public broadcasting and influencer culture
- Productivity tools, calendars, task management, or obligation-based scheduling
- Red notification badges, urgency language, or manipulative CTAs

The platform should feel calm, spacious, warm, and human.

---

## 3. MVP Scope

The first working demo must include all major product areas as functional surfaces, not placeholders:

1. Hearth rooms
2. Porch sessions
3. Embers ambient spaces
4. Grove open room directory
5. Letters
6. Chronicles
7. Rituals
8. Auth
9. Moderation
10. Admin controls
11. Data export/delete
12. PWA shell
13. Real-time text chat and presence
14. Private-room E2E encryption
15. Open-room plaintext mode

Later production hardening can improve scale, federation, mobile apps, and advanced moderation, but the scaffold must include the full product shape.

---

## 4. Platform

**Primary platform:** Web app + PWA  
**No mobile app in MVP.**

The web app must be installable as a PWA with:

- Install prompt
- Offline cached UI shell
- Local encrypted draft storage
- Push notification architecture prepared, but notifications disabled by default

---

## 5. Architecture

### 5.1 Codebase

A TypeScript monorepo:

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

### 5.2 Core Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Drizzle ORM
- SQLite by default
- PostgreSQL upgrade path
- Native WebSockets for realtime chat/presence
- Web Crypto API directly for private-room E2E
- Docker Compose support
- Local run support without Docker

### 5.3 Runtime Model

- Web UI runs on Next.js.
- SQLite stores structured data locally or on a small server.
- A native WebSocket server handles realtime room traffic.
- PostgreSQL can replace SQLite later through the same Drizzle schema layer.
- Redis is not required for the first working demo.

---

## 6. Auth

All auth modes are supported, with invite-code and email magic link as defaults.

Supported auth modes:

1. Invite-code login
2. Email magic link
3. Username-only session
4. OAuth
5. Local/offline demo account

MVP behavior:

- Invite-code and magic-link flows are primary.
- Demo auth is available for local development.
- OAuth is scaffolded behind config.
- Username-only mode is available for low-friction local/private deployments.

---

## 7. Rooms

Rooms are intimate persistent spaces capped at **12 active participants**.

### 7.1 Room Types

Every room has explicit visibility and privacy settings.

**Visibility modes:**

- `private_invite_only` — only invited users can join
- `link_only` — anyone with the room link can join
- `open_directory` — appears in Grove
- `open_porch_eligible` — may be used by Porch matching

**Privacy modes:**

- `private_e2e` — default E2E encryption
- `open_plaintext` — server-stored plaintext messages, searchable in Grove

### 7.2 Room Fields

Rooms include:

- ID
- Name
- Description
- Mood
- Topic
- Visibility mode
- Privacy mode
- Capacity, fixed at 12
- Steward ID
- Created timestamp
- Archived timestamp

### 7.3 Room Lifecycle

The 72-hour dim/archive rule is represented as a gentle manual archive state in MVP.

No background job is required for the first working demo.

---

## 8. Hearth

Hearth is the primary social space.

Features:

- Linear text conversation
- No reply-thread fractals
- No likes
- No shares
- No follower counts
- No engagement metrics
- Subtle presence indicators
- Steward role per room
- Room rules
- Manual archive

The Hearth UI should feel like sitting around a small table or campfire.

---

## 9. Porch

Porch is a low-friction entry space for meeting new people.

Features:

- 20-minute soft session window
- 2–4 person matching
- `Stay longer`
- `Exchange embers`
- `Step away`
- Admin-configurable matching mode

Matching modes:

1. Real-time random matching
2. Open lobby of temporary sit sessions

Porch sessions create temporary rooms with the same moderation and privacy model as normal rooms.

---

## 10. Embers

Embers are ambient co-presence spaces.

MVP includes:

- Static mood rooms
- Text chat
- Presence
- Optional ambient audio loop option
- Optional fireplace/visual atmosphere option

Examples:

- Rain in Wellington
- Quiet fireplace
- Synchronized reading hour
- Gentle music channel

Embers should not require users to perform conversation.

---

## 11. Grove

Grove is a simple open room directory.

Features:

- Search by mood
- Search by topic
- Search by room name
- Only rooms with open visibility appear
- No ranking algorithm
- No popularity metrics

Rooms can be hidden from Grove depending on room setup.

---

## 12. Letters

Letters are asynchronous, thoughtful messages.

Features:

- Long-form notes
- Send to an individual user
- Send to a room
- Optional delivery window:
  - morning
  - evening
  - now
- Stored privately unless sent to an open room
- Exportable as Markdown

Letters should encourage depth rather than instant response.

---

## 13. Chronicles

Chronicles are private personal archives.

Features:

- Rooms inhabited
- Letters kept
- Ritual summaries
- Personal notes
- No public visibility
- Exportable as JSON/Markdown

Chronicles should feel like a quiet library of time spent with others.

---

## 14. Rituals

Rituals are optional user-hosted gatherings.

Features:

- Storytelling circles
- Philosophy salons
- Poetry readings
- Quiet game nights
- Shared walks via future location-audio support
- Gentle summary for users who could not attend

Rituals use calendar-like clarity but no obligation.

---

## 15. Moderation

MVP moderation includes:

- Reports
- Mute by steward
- Ban by steward
- Room-level rules
- Transparency logs
- Admin visibility into non-E2E reports/logs

Moderation must be human-first and non-algorithmic.

No shadowbanning.

No engagement-based amplification.

---

## 16. Admin Controls

Server admins can:

- Choose Porch matching mode
- Toggle open/private room policy
- Manage invites
- View non-E2E moderation reports/logs
- Manage server settings
- Seed demo data

Admin controls should be calm and transparent, not surveillance-oriented.

---

## 17. Privacy and Encryption

### 17.1 Open Rooms

Open rooms use server-stored plaintext messages.

This allows:

- Grove search
- Moderation review
- Archive continuity

### 17.2 Private Rooms

Private rooms use E2E encryption by default.

Implementation choice:

- Use the Web Crypto API directly.
- Avoid heavy crypto dependencies in MVP.
- Generate room keys client-side.
- Store only ciphertext on the server.
- Support encrypted local drafts in the PWA.

### 17.3 Data Minimization

The platform stores only what is needed for continuity, moderation, and user-requested export.

No behavioral analytics.

No tracking pixels.

No engagement metrics.

---

## 18. Data Export and Deletion

MVP includes:

- JSON export
- Markdown export
- Instant account deletion
- Export of:
  - profile data
  - rooms
  - open-room messages
  - letters
  - chronicles
  - ritual summaries
  - moderation logs visible to the user

Private E2E data can only be exported from devices that hold the relevant keys.

---

## 19. UI and Brand

### 19.1 Navigation Metaphor

The app uses a physical lodge metaphor:

- Hearth
- Porch
- Embers
- Grove
- Letters
- Chronicles
- Rituals
- Admin

### 19.2 Visual Language

Default mode is a warm dark theme.

Colors:

- Ember Orange: `#D46A2E`
- Ash Gray: `#2C2C2E`
- Warm Sand: `#E8DCC4`
- Deep Pine: `#1A2F1A`

Typography:

- Headers/conversation: EB Garamond
- UI elements: Inter

Interaction style:

- Slow fades
- Gentle ember glows
- Natural easing
- No flashing elements
- No red notification badges
- Notifications disabled by default

---

## 20. Real-Time Communication

Use native WebSockets.

WebSocket events:

- `join_room`
- `leave_room`
- `message`
- `presence`
- `typing`
- `room_state`
- `error`

The WebSocket server should be simple, standards-based, and replaceable later with a distributed realtime layer.

---

## 21. Testing

The scaffold includes:

- Unit tests
- Integration tests
- Playwright E2E tests

Testing priorities:

1. Auth flows
2. Room creation
3. Private/open room modes
4. Real-time message delivery
5. Porch session creation
6. Moderation actions
7. Data export
8. PWA offline shell

---

## 22. Deployment

The app must be runnable:

- Locally without Docker
- With Docker Compose
- On a VPS
- On Fly.io or Render-style hosts

SQLite is the default database for small groups and local development.

PostgreSQL is the production upgrade path.

---

## 23. Success Measures

`tpt hearth` does not optimize for DAU, retention funnels, or screen time.

Preferred health signals:

- Depth of presence
- Bond formation
- Wellbeing self-reports
- Community health
- Steward rotation
- Conflict resolution success
- Archive richness

These should be optional, gentle, and privacy-preserving.

---

## 24. Future Phases

After the full MVP scaffold is functional:

1. Mobile apps
2. Voice presence
3. Federation protocol
4. Self-hosted nodes
5. Cooperative funding model
6. Advanced ritual tools
7. Location-audio shared walks
8. More sophisticated E2E group key management