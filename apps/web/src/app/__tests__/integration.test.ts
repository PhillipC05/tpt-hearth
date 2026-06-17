import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  createRoom,
  listRooms,
  createMessage,
  createPorchSession,
  listPorchSessions,
  exportJson,
  buildMarkdownExport,
  getSessionTokenFromRequest,
  listRoomMessages,
  searchGrove
} from "@/lib/api-server";
import {
  authenticateWithDemo,
  isDemoAuthAllowed,
  createOfflineDemoSession
} from "@/lib/auth";
import { seedDemoData, getDb, closeDb, ensureSchema } from "@tpt-hearth/db";

// Helper: insert a demo user directly into the singleton test database
function insertDemoUser(displayName = "Test User") {
  const database = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const suffix = crypto.randomUUID().slice(0, 8);
  const handle = `${displayName.toLowerCase().replace(/\s+/g, "-")}-${suffix}`;
  database
    .prepare(
      `insert into users (id, display_name, handle, email, auth_provider, created_at)
       values (?, ?, ?, ?, ?, ?)`
    )
    .run(id, displayName, handle, null, "local_demo", now);
  return {
    id,
    displayName,
    handle,
    email: null,
    authProvider: "local_demo" as const,
    createdAt: now
  };
}

function createTestSession(userId: string) {
  const database = getDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const sessionId = crypto.randomUUID();

  database
    .prepare(
      `insert into sessions (id, user_id, token_hash, expires_at, created_at)
       values (?, ?, ?, ?, ?)`
    )
    .run(sessionId, userId, tokenHash, expiresAt, now);

  return {
    sessionId,
    userId,
    token,
    expiresAt,
    createdAt: now,
    displayName: "",
    authProvider: "local_demo" as const
  };
}

// Reset the database state before first use
beforeAll(() => {
  seedDemoData(getDb());
});

afterAll(() => {
  closeDb();
});

describe("Demo Auth Integration", () => {
  it("authenticateWithDemo creates a user and session", async () => {
    const result = await authenticateWithDemo({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.authProvider).toBe("local_demo");
      expect(result.data.user.id).toBeTruthy();
      expect(result.data.session.token).toBeTruthy();
      expect(result.data.session.userId).toBe(result.data.user.id);
    }
  });

  it("authenticateWithDemo accepts a custom displayName", async () => {
    const result = await authenticateWithDemo({
      displayName: "Custom Name"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.displayName).toBe("Custom Name");
    }
  });

  it("isDemoAuthAllowed returns true in test environment", () => {
    expect(isDemoAuthAllowed()).toBe(true);
  });

  it("createOfflineDemoSession returns a valid session", () => {
    const session = createOfflineDemoSession("Offline User");
    expect(session.id).toMatch(/^offline-/);
    expect(session.userId).toBe("offline-demo-user");
    expect(session.token).toMatch(/^local-demo-/);
    expect(session.displayName).toBe("Offline User");
    expect(session.authProvider).toBe("local_demo");
  });

  it("getSessionTokenFromRequest extracts Bearer token", () => {
    const request = new Request("http://localhost:3000", {
      headers: { authorization: "Bearer my-token-123" }
    });
    expect(getSessionTokenFromRequest(request)).toBe("my-token-123");
  });

  it("getSessionTokenFromRequest extracts X-Session-Token header", () => {
    const request = new Request("http://localhost:3000", {
      headers: { "x-session-token": "session-token-456" }
    });
    expect(getSessionTokenFromRequest(request)).toBe("session-token-456");
  });

  it("getSessionTokenFromRequest returns null when no auth header present", () => {
    const request = new Request("http://localhost:3000");
    expect(getSessionTokenFromRequest(request)).toBeNull();
  });
});

describe("Room Creation Integration", () => {
  let user: ReturnType<typeof insertDemoUser>;
  let session: ReturnType<typeof createTestSession>;

  beforeAll(() => {
    user = insertDemoUser("Room Creator");
    session = createTestSession(user.id);
  });

  it("creates a room and returns a room summary", () => {
    const result = createRoom(
      {
        name: "Integration Test Room",
        description: "Testing room creation",
        mood: "curious",
        topic: "testing",
        visibility: "open_directory",
        privacyMode: "open_plaintext",
        rules: "Test away."
      },
      user.id
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Integration Test Room");
      expect(result.data.mood).toBe("curious");
      expect(result.data.topic).toBe("testing");
      expect(result.data.visibility).toBe("open_directory");
      expect(result.data.privacyMode).toBe("open_plaintext");
      expect(result.data.stewardId).toBe(user.id);
      expect(result.data.memberCount).toBe(1);
      expect(result.data.capacity).toBe(12);
      expect(result.data.archivedAt).toBeNull();
    }
  });

  it("lists rooms the user has access to", () => {
    const result = listRooms(user.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      const created = result.data.find((r) => r.name === "Integration Test Room");
      expect(created).toBeTruthy();
    }
  });
});

describe("Message Persistence Integration", () => {
  let user: ReturnType<typeof insertDemoUser>;
  let session: ReturnType<typeof createTestSession>;
  let roomId: string;

  beforeAll(() => {
    user = insertDemoUser("Message Author");
    session = createTestSession(user.id);

    const room = createRoom(
      {
        name: "Message Room",
        description: "Room for messages",
        mood: "chatty",
        topic: "communication",
        visibility: "link_only",
        privacyMode: "open_plaintext",
        rules: ""
      },
      user.id
    );
    expect(room.ok).toBe(true);
    if (room.ok) roomId = room.data.id;
  });

  it("creates and retrieves a plaintext message", () => {
    const msgResult = createMessage(
      {
        roomId,
        body: "Hello from the integration test!",
        privacyMode: "open_plaintext"
      },
      user.id
    );
    expect(msgResult.ok).toBe(true);
    if (msgResult.ok) {
      expect(msgResult.data.bodyPlaintext).toBe(
        "Hello from the integration test!"
      );
      expect(msgResult.data.bodyCiphertext).toBeNull();
      expect(msgResult.data.authorId).toBe(user.id);
      expect(msgResult.data.roomId).toBe(roomId);
      expect(msgResult.data.deletedAt).toBeNull();
    }
  });

  it("lists messages for a room", () => {
    const request = new Request(`http://localhost:3000?limit=50`, {
      headers: { authorization: `Bearer ${session.token}` }
    });
    const result = listRoomMessages(roomId, user.id, request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data[0]?.bodyPlaintext).toBe(
        "Hello from the integration test!"
      );
    }
  });
});

describe("Porch Session Creation Integration", () => {
  let user: ReturnType<typeof insertDemoUser>;
  let session: ReturnType<typeof createTestSession>;

  beforeAll(() => {
    user = insertDemoUser("Porch Sitter");
    session = createTestSession(user.id);
  });

  it("creates a porch session with a room", () => {
    const result = createPorchSession(
      { mode: "open_lobby", durationMinutes: 30 },
      user.id
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.mode).toBe("open_lobby");
      expect(result.data.status).toBe("waiting");
      expect(result.data.room.visibility).toBe("open_porch_eligible");
      expect(result.data.room.name).toMatch(/Porch/);
      expect(result.data.startsAt).toBeTruthy();
      expect(result.data.endsAt).toBeTruthy();
    }
  });

  it("creates a random_matching porch session", () => {
    const result = createPorchSession(
      { mode: "random_matching", durationMinutes: 60 },
      user.id
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.mode).toBe("random_matching");
      expect(result.data.status).toBe("waiting");
    }
  });
});

describe("Data Export Integration", () => {
  let user: ReturnType<typeof insertDemoUser>;
  let session: ReturnType<typeof createTestSession>;

  beforeAll(() => {
    user = insertDemoUser("Export User");
    session = createTestSession(user.id);

    // Create a room with a message for export data
    const room = createRoom(
      {
        name: "Export Room",
        description: "Data for export",
        mood: "reflective",
        topic: "exporting",
        visibility: "open_directory",
        privacyMode: "open_plaintext",
        rules: ""
      },
      user.id
    );
    if (room.ok) {
      createMessage(
        {
          roomId: room.data.id,
          body: "Message for export test.",
          privacyMode: "open_plaintext"
        },
        user.id
      );
    }
  });

  it("exportJson returns all user data", () => {
    const result = exportJson(user.id);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.id).toBe(user.id);
      expect(result.data.rooms.length).toBeGreaterThanOrEqual(1);
      expect(result.data.messages.length).toBeGreaterThanOrEqual(1);
      expect(result.data.exportedAt).toBeTruthy();
    }
  });

  it("exportJson throws ApiFailure for nonexistent user", () => {
    expect(() => exportJson("nonexistent-user-id")).toThrow();
  });

  it("buildMarkdownExport returns a markdown string", () => {
    const markdown = buildMarkdownExport(user.id);
    expect(markdown).toContain("# tpt hearth export");
    expect(markdown).toContain("Export User");
    expect(markdown).toContain("Export Room");
    expect(markdown).toContain("Message for export test.");
  });

  it("buildMarkdownExport throws for nonexistent user", () => {
    expect(() => buildMarkdownExport("nonexistent-user-id")).toThrow();
  });
});