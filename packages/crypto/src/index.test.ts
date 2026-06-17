import { describe, it, expect, beforeAll } from "vitest";
import {
  generateRoomKey,
  importRoomKey,
  encryptMessage,
  decryptMessage,
  serializeEncryptedMessage,
  deserializeEncryptedMessage,
  encryptDraft,
  decryptDraft,
  deserializeEncryptedDraft,
  encryptDraftForStorage,
  decryptDraftFromStorage,
  toBase64Url,
  fromBase64Url,
  getCrypto,
  isCryptoAvailable
} from "./index";

beforeAll(() => {
  // Web Crypto API is available in modern Node via globalThis.crypto
  if (!isCryptoAvailable()) {
    throw new Error("Web Crypto API is required for these tests.");
  }
});

describe("toBase64Url / fromBase64Url", () => {
  it("round-trips a simple string", () => {
    const input = new TextEncoder().encode("hello world");
    const encoded = toBase64Url(input);
    const decoded = fromBase64Url(encoded);
    expect(new TextDecoder().decode(decoded)).toBe("hello world");
  });

  it("produces URL-safe base64 (no +, /, or = padding)", () => {
    const input = new Uint8Array([0, 255, 128, 64, 32]);
    const encoded = toBase64Url(input);
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toMatch(/=+$/);
  });

  it("round-trips binary data", () => {
    const input = new Uint8Array(256);
    for (let i = 0; i < 256; i++) input[i] = i;
    const encoded = toBase64Url(input);
    const decoded = fromBase64Url(encoded);
    expect(new Uint8Array(decoded)).toEqual(input);
  });
});

describe("generateRoomKey / importRoomKey", () => {
  it("generates a key bundle with a kid and usable CryptoKey", async () => {
    const bundle = await generateRoomKey();
    expect(bundle.kid).toBeTruthy();
    expect(bundle.key.algorithm).toMatchObject({
      name: "AES-GCM",
      length: 256
    });
    expect(bundle.key.usages).toContain("encrypt");
    expect(bundle.key.usages).toContain("decrypt");
    expect(bundle.exported.kid).toBe(bundle.kid);
  });

  it("generates a key with a custom keyId", async () => {
    const customKid = "my-custom-key-id";
    const bundle = await generateRoomKey(customKid);
    expect(bundle.kid).toBe(customKid);
  });

  it("imports a key back from exported JWK", async () => {
    const bundle = await generateRoomKey();
    const imported = await importRoomKey(bundle.exported);
    expect(imported.kid).toBe(bundle.kid);
    expect(imported.key.algorithm).toMatchObject({
      name: "AES-GCM",
      length: 256
    });
  });

  it("imports a key with a new kid override", async () => {
    const bundle = await generateRoomKey();
    const newKid = "re-imported-key";
    const imported = await importRoomKey(bundle.exported, newKid);
    expect(imported.kid).toBe(newKid);
  });
});

describe("encryptMessage / decryptMessage round trip", () => {
  it("encrypts and decrypts a plaintext message", async () => {
    const bundle = await generateRoomKey();
    const plaintext = "This is a secret message.";
    const payload = await encryptMessage(plaintext, bundle.key, bundle.kid);
    expect(payload.v).toBe(1);
    expect(payload.kid).toBe(bundle.kid);
    expect(payload.iv).toBeTruthy();
    expect(payload.ciphertext).toBeTruthy();
    expect(payload.ciphertext).not.toContain(plaintext);

    const decrypted = await decryptMessage(payload, bundle.key);
    expect(decrypted).toBe(plaintext);
  });

  it("encrypts and decrypts a message with AAD", async () => {
    const bundle = await generateRoomKey();
    const plaintext = "AAD-protected message.";
    const aad = "room-123:user-456";
    const payload = await encryptMessage(plaintext, bundle.key, bundle.kid, aad);
    expect(payload.aad).toBe(aad);

    const decrypted = await decryptMessage(payload, bundle.key);
    expect(decrypted).toBe(plaintext);
  });

  it("rejects decryption with a different key", async () => {
    const bundleA = await generateRoomKey();
    const bundleB = await generateRoomKey();
    const payload = await encryptMessage("hello", bundleA.key, bundleA.kid);
    await expect(decryptMessage(payload, bundleB.key)).rejects.toThrow();
  });

  it("produces different ciphertexts for the same plaintext (nonce-based)", async () => {
    const bundle = await generateRoomKey();
    const plaintext = "Same text each time.";
    const payload1 = await encryptMessage(plaintext, bundle.key, bundle.kid);
    const payload2 = await encryptMessage(plaintext, bundle.key, bundle.kid);
    expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
    expect(payload1.iv).not.toBe(payload2.iv);
  });

  it("handles empty string", async () => {
    const bundle = await generateRoomKey();
    const plaintext = "";
    const payload = await encryptMessage(plaintext, bundle.key, bundle.kid);
    const decrypted = await decryptMessage(payload, bundle.key);
    expect(decrypted).toBe(plaintext);
  });

  it("handles Unicode characters", async () => {
    const bundle = await generateRoomKey();
    const plaintext = "🔥 你好 🌍 émojis और यूनिकोड";
    const payload = await encryptMessage(plaintext, bundle.key, bundle.kid);
    const decrypted = await decryptMessage(payload, bundle.key);
    expect(decrypted).toBe(plaintext);
  });

  it("handles large messages (100KB)", async () => {
    const bundle = await generateRoomKey();
    const plaintext = "x".repeat(100_000);
    const payload = await encryptMessage(plaintext, bundle.key, bundle.kid);
    const decrypted = await decryptMessage(payload, bundle.key);
    expect(decrypted).toBe(plaintext);
    expect(decrypted.length).toBe(100_000);
  });
});

describe("serializeEncryptedMessage / deserializeEncryptedMessage", () => {
  it("serializes and deserializes a payload", async () => {
    const bundle = await generateRoomKey();
    const payload = await encryptMessage("hello", bundle.key, bundle.kid);
    const serialized = serializeEncryptedMessage(payload);
    const deserialized = deserializeEncryptedMessage(serialized);
    expect(deserialized).toEqual(payload);
  });

  it("deserializeEncryptedMessage rejects malformed payloads", () => {
    expect(() => deserializeEncryptedMessage("{}")).toThrow();
    expect(() => deserializeEncryptedMessage('{"v":1}')).toThrow();
    expect(() => deserializeEncryptedMessage("not-json")).toThrow();
    expect(() =>
      deserializeEncryptedMessage(
        '{"v":1,"kid":"k","iv":"iv","ciphertext":"ct"}'
      )
    ).not.toThrow();
  });
});

describe("encryptDraft / decryptDraft round trip", () => {
  it("encrypts and decrypts a draft with a passphrase", async () => {
    const plaintext = "My encrypted draft content.";
    const passphrase = "my-strong-passphrase";
    const encrypted = await encryptDraft(plaintext, passphrase);
    expect(encrypted.v).toBe(1);
    expect(encrypted.kdf).toBe("PBKDF2");
    expect(encrypted.hash).toBe("SHA-256");
    expect(encrypted.alg).toBe("AES-GCM");
    expect(encrypted.iterations).toBe(250_000);
    expect(encrypted.salt).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.ciphertext).toBeTruthy();

    const decrypted = await decryptDraft(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it("rejects decryption with the wrong passphrase", async () => {
    const encrypted = await encryptDraft("secret", "correct-passphrase");
    await expect(
      decryptDraft(encrypted, "wrong-passphrase")
    ).rejects.toThrow();
  });

  it("encrypts with custom iterations count", async () => {
    const plaintext = "Custom iterations draft.";
    const passphrase = "test-pass";
    const encrypted = await encryptDraft(plaintext, passphrase, 100_000);
    expect(encrypted.iterations).toBe(100_000);

    const decrypted = await decryptDraft(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string draft", async () => {
    const encrypted = await encryptDraft("", "passphrase");
    const decrypted = await decryptDraft(encrypted, "passphrase");
    expect(decrypted).toBe("");
  });

  it("handles Unicode in drafts", async () => {
    const plaintext = "🌟 Unicódé dräft 🎉";
    const encrypted = await encryptDraft(plaintext, "pass");
    const decrypted = await decryptDraft(encrypted, "pass");
    expect(decrypted).toBe(plaintext);
  });

  it("rejects empty passphrase", async () => {
    await expect(encryptDraft("hello", "")).rejects.toThrow(
      "Draft passphrase must not be empty."
    );
  });

  it("rejects unsupported KDF in payload", async () => {
    const payload = {
      v: 1,
      kdf: "UNSUPPORTED",
      hash: "SHA-256",
      alg: "AES-GCM",
      iterations: 100,
      salt: "abc",
      iv: "abc",
      ciphertext: "abc"
    };
    await expect(decryptDraft(payload as any, "pass")).rejects.toThrow(
      "Unsupported encrypted draft payload."
    );
  });
});

describe("encryptDraftForStorage / decryptDraftFromStorage", () => {
  it("are aliases for encryptDraft / decryptDraft", async () => {
    const plaintext = "Storage draft.";
    const passphrase = "storage-pass";
    const encrypted = await encryptDraftForStorage(plaintext, passphrase);
    const decrypted = await decryptDraftFromStorage(encrypted, passphrase);
    expect(decrypted).toBe(plaintext);
  });
});

describe("deserializeEncryptedDraft", () => {
  it("deserializes a valid serialized draft", () => {
    const payload = {
      v: 1,
      kdf: "PBKDF2" as const,
      hash: "SHA-256" as const,
      alg: "AES-GCM" as const,
      iterations: 250_000,
      salt: "abc123",
      iv: "def456",
      ciphertext: "ghi789"
    };
    const serialized = JSON.stringify(payload);
    const deserialized = deserializeEncryptedDraft(serialized);
    expect(deserialized).toEqual(payload);
  });

  it("rejects invalid serialized drafts", () => {
    expect(() => deserializeEncryptedDraft("{}")).toThrow();
    expect(() =>
      deserializeEncryptedDraft('{"v":1,"kdf":"PBKDF2"}')
    ).toThrow();
    expect(() => deserializeEncryptedDraft("not-json")).toThrow();
    expect(() =>
      deserializeEncryptedDraft(
        JSON.stringify({
          v: 1,
          kdf: "PBKDF2",
          hash: "SHA-256",
          alg: "AES-GCM",
          iterations: 250_000,
          salt: "s",
          iv: "i",
          ciphertext: "c"
        })
      )
    ).not.toThrow();
  });
});

describe("getCrypto / isCryptoAvailable", () => {
  it("getCrypto returns the global crypto object", () => {
    const crypto = getCrypto();
    expect(crypto.randomUUID).toBeDefined();
    expect(crypto.subtle).toBeDefined();
  });

  it("isCryptoAvailable returns true in this environment", () => {
    expect(isCryptoAvailable()).toBe(true);
  });
});