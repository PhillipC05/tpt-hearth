import { describe, it, expect } from "vitest";
import {
  messageInputSchema,
  messageInputBaseSchema,
  messageSchema,
  validateMessageInput,
  parseMessageInput
} from "@tpt-hearth/shared";
import { roomPrivacyModes } from "@tpt-hearth/config";

describe("messageInputBaseSchema validation", () => {
  const validMessageInput = {
    roomId: "room-123",
    body: "Hello, world!",
    privacyMode: "open_plaintext" as const
  };

  it("accepts a valid message input", () => {
    const result = messageInputBaseSchema.safeParse(validMessageInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing roomId", () => {
    const { roomId, ...rest } = validMessageInput;
    const result = messageInputBaseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects empty body", () => {
    const result = messageInputBaseSchema.safeParse({
      ...validMessageInput,
      body: ""
    });
    expect(result.success).toBe(false);
  });

  it("rejects body exceeding 20,000 characters", () => {
    const result = messageInputBaseSchema.safeParse({
      ...validMessageInput,
      body: "x".repeat(20_001)
    });
    expect(result.success).toBe(false);
  });

  it("accepts body at exactly 20,000 characters", () => {
    const result = messageInputBaseSchema.safeParse({
      ...validMessageInput,
      body: "x".repeat(20_000)
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid privacyMode", () => {
    const result = messageInputBaseSchema.safeParse({
      ...validMessageInput,
      privacyMode: "invalid_mode"
    });
    expect(result.success).toBe(false);
  });
});

describe("messageInputSchema (with superRefine for E2E)", () => {
  const validE2eInput = {
    roomId: "room-123",
    body: "Encrypted content placeholder",
    privacyMode: "private_e2e" as const,
    bodyCiphertext: "base64encodedciphertext",
    nonce: "base64encodednonce",
    keyVersion: "key-v1"
  };

  const validPlaintextInput = {
    roomId: "room-123",
    body: "Hello, world!",
    privacyMode: "open_plaintext" as const
  };

  it("accepts valid E2E input with ciphertext and nonce", () => {
    const result = messageInputSchema.safeParse(validE2eInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid plaintext input without ciphertext", () => {
    const result = messageInputSchema.safeParse(validPlaintextInput);
    expect(result.success).toBe(true);
  });

  it("rejects E2E message without bodyCiphertext", () => {
    const { bodyCiphertext, ...rest } = validE2eInput;
    const result = messageInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const ciphertextIssues = result.error.issues.filter(
        (i) => i.path[0] === "bodyCiphertext"
      );
      expect(ciphertextIssues.length).toBeGreaterThan(0);
    }
  });

  it("rejects E2E message without nonce", () => {
    const { nonce, ...rest } = validE2eInput;
    const result = messageInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
    if (!result.success) {
      const nonceIssues = result.error.issues.filter(
        (i) => i.path[0] === "nonce"
      );
      expect(nonceIssues.length).toBeGreaterThan(0);
    }
  });
});

describe("messageSchema validation", () => {
  const validMessage = {
    id: "msg-1",
    roomId: "room-123",
    authorId: "user-1",
    bodyPlaintext: "Hello!",
    bodyCiphertext: null,
    nonce: null,
    keyVersion: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    deletedAt: null
  };

  it("accepts a valid message", () => {
    const result = messageSchema.safeParse(validMessage);
    expect(result.success).toBe(true);
  });

  it("accepts an E2E encrypted message", () => {
    const result = messageSchema.safeParse({
      ...validMessage,
      bodyPlaintext: null,
      bodyCiphertext: "ciphertext",
      nonce: "nonce",
      keyVersion: "v1"
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid createdAt", () => {
    const result = messageSchema.safeParse({
      ...validMessage,
      createdAt: "not-a-date"
    });
    expect(result.success).toBe(false);
  });
});

describe("validateMessageInput", () => {
  it("returns ok for valid plaintext input", () => {
    const result = validateMessageInput({
      roomId: "room-123",
      body: "Hello!",
      privacyMode: "open_plaintext"
    });
    expect(result.ok).toBe(true);
  });

  it("returns error for empty input", () => {
    const result = validateMessageInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
    }
  });

  it("parseMessageInput is an alias for validateMessageInput", () => {
    const input = {
      roomId: "room-123",
      body: "Hello!",
      privacyMode: "open_plaintext" as const
    };
    expect(parseMessageInput(input)).toEqual(validateMessageInput(input));
  });

  it("returns error for E2E message missing fields", () => {
    const result = validateMessageInput({
      roomId: "room-123",
      body: "placeholder",
      privacyMode: "private_e2e"
    });
    expect(result.ok).toBe(false);
  });
});