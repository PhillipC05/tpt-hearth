import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  handle: text("handle").notNull().unique(),
  email: text("email"),
  authProvider: text("auth_provider").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const invites = sqliteTable("invites", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  maxUses: integer("max_uses").notNull().default(1),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: text("expires_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  mood: text("mood").notNull(),
  topic: text("topic").notNull(),
  visibility: text("visibility").notNull(),
  privacyMode: text("privacy_mode").notNull(),
  capacity: integer("capacity").notNull().default(12),
  stewardId: text("steward_id").references(() => users.id, { onDelete: "set null" }),
  rules: text("rules").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  archivedAt: text("archived_at")
});

export const roomMembers = sqliteTable(
  "room_members",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: text("joined_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    leftAt: text("left_at")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roomId, table.userId] })
  })
);

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  bodyPlaintext: text("body_plaintext"),
  bodyCiphertext: text("body_ciphertext"),
  nonce: text("nonce"),
  keyVersion: text("key_version"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text("deleted_at")
});

export const porchSessions = sqliteTable("porch_sessions", {
  id: text("id").primaryKey(),
  mode: text("mode").notNull(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at").notNull(),
  status: text("status").notNull().default("waiting"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const letters = sqliteTable("letters", {
  id: text("id").primaryKey(),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientUserId: text("recipient_user_id").references(() => users.id, { onDelete: "set null" }),
  recipientRoomId: text("recipient_room_id").references(() => rooms.id, { onDelete: "set null" }),
  subject: text("subject").notNull(),
  bodyPlaintext: text("body_plaintext"),
  bodyCiphertext: text("body_ciphertext"),
  nonce: text("nonce"),
  deliveryWindow: text("delivery_window").notNull().default("now"),
  deliveredAt: text("delivered_at"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const chronicles = sqliteTable("chronicles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  bodyPlaintext: text("body_plaintext"),
  bodyCiphertext: text("body_ciphertext"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const rituals = sqliteTable("rituals", {
  id: text("id").primaryKey(),
  hostId: text("host_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roomId: text("room_id").references(() => rooms.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  startsAt: text("starts_at").notNull(),
  summary: text("summary"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetUserId: text("target_user_id").references(() => users.id, { onDelete: "set null" }),
  targetRoomId: text("target_room_id").references(() => rooms.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const moderationActions = sqliteTable("moderation_actions", {
  id: text("id").primaryKey(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetUserId: text("target_user_id").references(() => users.id, { onDelete: "set null" }),
  targetRoomId: text("target_room_id").references(() => rooms.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const transparencyLogs = sqliteTable("transparency_logs", {
  id: text("id").primaryKey(),
  actionId: text("action_id")
    .notNull()
    .references(() => moderationActions.id, { onDelete: "cascade" }),
  publicNote: text("public_note").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});

export const usersRelations = relations(users, ({ many }) => ({
  roomsStewarded: many(rooms),
  messages: many(messages),
  letters: many(letters),
  chronicles: many(chronicles),
  ritualsHosted: many(rituals)
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  steward: one(users, {
    fields: [rooms.stewardId],
    references: [users.id]
  }),
  members: many(roomMembers),
  messages: many(messages),
  porchSessions: many(porchSessions),
  rituals: many(rituals)
}));

export const roomMembersRelations = relations(roomMembers, ({ one }) => ({
  room: one(rooms, {
    fields: [roomMembers.roomId],
    references: [rooms.id]
  }),
  user: one(users, {
    fields: [roomMembers.userId],
    references: [users.id]
  })
}));