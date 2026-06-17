# PostgreSQL schema parity notes

The SQLite schema in `packages/db/src/schema.ts` is the source of truth for the local MVP database. PostgreSQL should keep the same domain model and table names where possible.

## Mapping guidance

- Use `TEXT PRIMARY KEY` for `id` columns.
- Use `TEXT NOT NULL` for string columns that are required in SQLite.
- Use `INTEGER NOT NULL DEFAULT 12` for `rooms.capacity`; room capacity remains fixed at `12`.
- Use `TIMESTAMPTZ` for timestamp columns that are currently stored as ISO strings in SQLite.
- Keep enum-like values as `TEXT` with database checks or application-level validation until a shared enum package is added.
- Preserve foreign keys with `ON DELETE CASCADE` and `ON DELETE SET NULL` behavior from the SQLite schema.
- Preserve composite primary key behavior for `room_members(room_id, user_id)`.

## Index parity

PostgreSQL should include equivalent indexes for the SQLite indexes in `ensureSchema()`:

- `rooms(visibility)`
- `rooms(mood)`
- `rooms(topic)`
- `rooms(archived_at)`
- `messages(room_id)`
- `messages(created_at)`
- `room_members(user_id)`
- `letters(recipient_user_id)`
- `letters(created_at)`
- `rituals(starts_at)`

## SQLite-specific behavior

The local helper intentionally uses SQLite conveniences:

- `ensureSchema()` creates tables with `CREATE TABLE IF NOT EXISTS`.
- Seed data uses `INSERT OR IGNORE`.
- Timestamps are stored as ISO strings by default.

When adding a PostgreSQL adapter, route all API/database access through `packages/db` so callers do not depend on SQLite-specific SQL.