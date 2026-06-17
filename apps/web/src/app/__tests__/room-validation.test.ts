import { describe, it, expect } from "vitest";
import {
  roomInputSchema,
  roomSchema,
  roomVisibilitySchema,
  roomPrivacyModeSchema,
  validateRoomInput,
  parseRoomInput
} from "@tpt-hearth/shared";
import { roomVisibilityModes, roomPrivacyModes } from "@tpt-hearth/config";

const validRoomInput = {
  name: "Test Room",
  description: "A cozy room for testing",
  mood: "warm",
  topic: "testing",
  visibility: "open_directory" as const,
  privacyMode: "open_plaintext" as const,
  rules: "Be kind."
};

const validRoom = {
  id: "abc-123",
  name: "Test Room",
  description: "A cozy room",
  mood: "warm",
  topic: "testing",
  visibility: "open_directory" as const,
  privacyMode: "open_plaintext" as const,
  capacity: 12 as const,
  stewardId: "user-1",
  rules: "Be kind.",
  createdAt: "2025-01-01T00:00:00.000Z",
  archivedAt: null
};

describe("roomInputSchema validation", () => {
  it("accepts a valid room input", () => {
    const result = roomInputSchema.safeParse(validRoomInput);
    expect(result.success).toBe(true);
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = roomInputSchema.safeParse({ ...validRoomInput, name: "A" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("name");
    }
  });

  it("rejects a name longer than 80 characters", () => {
    const result = roomInputSchema.safeParse({
      ...validRoomInput,
      name: "x".repeat(81)
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name, ...rest } = validRoomInput;
    const result = roomInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing mood", () => {
    const { mood, ...rest } = validRoomInput;
    const result = roomInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing topic", () => {
    const { topic, ...rest } = validRoomInput;
    const result = roomInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 characters", () => {
    const result = roomInputSchema.safeParse({
      ...validRoomInput,
      description: "x".repeat(501)
    });
    expect(result.success).toBe(false);
  });

  it("rejects rules longer than 1000 characters", () => {
    const result = roomInputSchema.safeParse({
      ...validRoomInput,
      rules: "x".repeat(1001)
    });
    expect(result.success).toBe(false);
  });

  it("defaults description to empty string when explicitly provided as empty", () => {
    const result = roomInputSchema.parse({ ...validRoomInput, description: "" });
    expect(result.description).toBe("");
  });

  it("defaults rules to empty string when explicitly provided as empty", () => {
    const result = roomInputSchema.parse({ ...validRoomInput, rules: "" });
    expect(result.rules).toBe("");
  });
});

describe("roomSchema validation", () => {
  it("accepts a valid full room object", () => {
    const result = roomSchema.safeParse(validRoom);
    expect(result.success).toBe(true);
  });

  it("rejects capacity other than 12", () => {
    const result = roomSchema.safeParse({ ...validRoom, capacity: 10 });
    expect(result.success).toBe(false);
  });

  it("accepts null stewardId and archivedAt", () => {
    const result = roomSchema.safeParse({
      ...validRoom,
      stewardId: null,
      archivedAt: null
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid createdAt", () => {
    const result = roomSchema.safeParse({
      ...validRoom,
      createdAt: "not-a-date"
    });
    expect(result.success).toBe(false);
  });
});

describe("room visibility mode validation", () => {
  it("accepts all valid visibility values", () => {
    for (const mode of Object.values(roomVisibilityModes)) {
      expect(roomVisibilitySchema.safeParse(mode).success).toBe(true);
    }
  });

  it("rejects invalid visibility values", () => {
    expect(roomVisibilitySchema.safeParse("invalid_visibility").success).toBe(false);
    expect(roomVisibilitySchema.safeParse("").success).toBe(false);
    expect(roomVisibilitySchema.safeParse(123).success).toBe(false);
  });

  it("rejects undefined visibility", () => {
    expect(roomVisibilitySchema.safeParse(undefined).success).toBe(false);
  });
});

describe("room privacy mode validation", () => {
  it("accepts all valid privacy mode values", () => {
    for (const mode of Object.values(roomPrivacyModes)) {
      expect(roomPrivacyModeSchema.safeParse(mode).success).toBe(true);
    }
  });

  it("rejects invalid privacy mode values", () => {
    expect(roomPrivacyModeSchema.safeParse("invalid_privacy").success).toBe(false);
    expect(roomPrivacyModeSchema.safeParse("").success).toBe(false);
    expect(roomPrivacyModeSchema.safeParse(null).success).toBe(false);
  });
});

describe("validateRoomInput / parseRoomInput", () => {
  it("returns ok for valid input", () => {
    const result = validateRoomInput(validRoomInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Test Room");
    }
  });

  it("returns error for invalid input", () => {
    const result = validateRoomInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });

  it("parseRoomInput is an alias for validateRoomInput", () => {
    const result1 = parseRoomInput(validRoomInput);
    const result2 = validateRoomInput(validRoomInput);
    expect(result1).toEqual(result2);
  });
});