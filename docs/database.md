# `tpt hearth` Database Notes

## Default database

SQLite is the default database for local development and small groups.

Default path:

```txt
.data/hearth.sqlite
```

## Production upgrade path

PostgreSQL should use the same domain model with equivalent tables and indexes.

The application should avoid SQLite-specific SQL in API routes where possible. Database access should go through `packages/db`.

## Core tables

### `users`

- `id`
- `display_name`
- `handle`
- `email`
- `auth_provider`
- `created_at`

### `sessions`

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`

### `invites`

- `id`
- `code`
- `created_by_user_id`
- `max_uses`
- `used_count`
- `expires_at`
- `created_at`

### `rooms`

- `id`
- `name`
- `description`
- `mood`
- `topic`
- `visibility`
- `privacy_mode`
- `capacity`
- `steward_id`
- `rules`
- `created_at`
- `archived_at`

### `room_members`

- `room_id`
- `user_id`
- `role`
- `joined_at`
- `left_at`

### `messages`

- `id`
- `room_id`
- `author_id`
- `body_plaintext`
- `body_ciphertext`
- `nonce`
- `key_version`
- `created_at`
- `deleted_at`

### `porch_sessions`

- `id`
- `mode`
- `room_id`
- `starts_at`
- `ends_at`
- `status`
- `created_at`

### `letters`

- `id`
- `author_id`
- `recipient_user_id`
- `recipient_room_id`
- `subject`
- `body_plaintext`
- `body_ciphertext`
- `nonce`
- `delivery_window`
- `delivered_at`
- `created_at`

### `chronicles`

- `id`
- `user_id`
- `kind`
- `title`
- `body_plaintext`
- `body_ciphertext`
- `metadata_json`
- `created_at`

### `rituals`

- `id`
- `host_id`
- `room_id`
- `title`
- `description`
- `starts_at`
- `summary`
- `created_at`

### `reports`

- `id`
- `reporter_id`
- `target_user_id`
- `target_room_id`
- `reason`
- `status`
- `created_at`

### `moderation_actions`

- `id`
- `actor_id`
- `target_user_id`
- `target_room_id`
- `action`
- `reason`
- `created_at`

### `transparency_logs`

- `id`
- `action_id`
- `public_note`
- `created_at`

### `settings`

- `id`
- `key`
- `value`
- `updated_at`

## Important constraints

- Room capacity is fixed at `12`.
- Private-room message plaintext must never be stored server-side.
- Open-room messages may be stored plaintext for moderation/search/export.
- Grove should query only rooms with open-directory visibility.
- Porch sessions should create temporary rooms with the same moderation model.

## Indexes

Recommended indexes:

- `rooms.visibility`
- `rooms.mood`
- `rooms.topic`
- `rooms.archived_at`
- `messages.room_id`
- `messages.created_at`
- `room_members.user_id`
- `letters.recipient_user_id`
- `letters.created_at`
- `rituals.starts_at`

## Migrations

Use Drizzle Kit for schema generation once dependencies are installed.

Commands:

```sh
pnpm db:generate
pnpm db:migrate
```

For the first working demo, `ensureSchema()` can also create tables automatically if they do not exist.