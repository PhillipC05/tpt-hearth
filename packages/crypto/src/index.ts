export type EncryptedMessagePayload = {
  v: 1;
  kid: string;
  iv: string;
  ciphertext: string;
  aad?: string;
};

export type RoomKeyJwk = JsonWebKey & {
  kid?: string;
};

export type RoomKeyBundle = {
  kid: string;
  key: CryptoKey;
  exported: RoomKeyJwk;
};

export type EncryptedDraftPayload = {
  v: 1;
  kdf: "PBKDF2";
  hash: "SHA-256";
  alg: "AES-GCM";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
};

export type DraftStorageOptions = {
  storage?: Storage;
  storageKey?: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const KEY_LENGTH_BITS = 256;
const IV_BYTE_LENGTH = 12;
const SALT_BYTE_LENGTH = 16;
const DEFAULT_PBKDF2_ITERATIONS = 250_000;

export function getCrypto(): Crypto {
  const runtimeCrypto = globalThis.crypto;

  if (!runtimeCrypto?.subtle) {
    throw new Error("Web Crypto API is not available in this runtime.");
  }

  return runtimeCrypto;
}

export function isCryptoAvailable(): boolean {
  return Boolean(globalThis.crypto?.subtle);
}

export function assertCryptoAvailable(): void {
  if (!isCryptoAvailable()) {
    throw new Error("Web Crypto API is not available in this runtime.");
  }
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";

  for (const byte of source) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export async function generateRoomKey(keyId: string = getCrypto().randomUUID()): Promise<RoomKeyBundle> {
  const subtle = getCrypto().subtle;
  const key = await subtle.generateKey(
    {
      name: "AES-GCM",
      length: KEY_LENGTH_BITS
    },
    true,
    ["encrypt", "decrypt"]
  );
  const exported = (await subtle.exportKey("jwk", key)) as RoomKeyJwk;

  return {
    kid: keyId,
    key,
    exported: {
      ...exported,
      kid: keyId
    }
  };
}

export async function exportRoomKey(key: CryptoKey): Promise<RoomKeyJwk> {
  return (await getCrypto().subtle.exportKey("jwk", key)) as RoomKeyJwk;
}

export async function importRoomKey(exported: RoomKeyJwk, keyId = exported.kid ?? getCrypto().randomUUID()): Promise<RoomKeyBundle> {
  const key = await getCrypto().subtle.importKey(
    "jwk",
    exported,
    {
      name: "AES-GCM",
      length: KEY_LENGTH_BITS
    },
    true,
    ["encrypt", "decrypt"]
  );

  return {
    kid: keyId,
    key,
    exported: {
      ...exported,
      kid: keyId
    }
  };
}

export async function importRoomKeyFromJwk(exported: RoomKeyJwk, keyId = exported.kid ?? getCrypto().randomUUID()): Promise<RoomKeyBundle> {
  return importRoomKey(exported, keyId);
}

export async function encryptMessage(plaintext: string, key: CryptoKey, keyId: string, additionalData?: string): Promise<EncryptedMessagePayload> {
  const iv = getCrypto().getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const aad = additionalData ? encoder.encode(additionalData) : undefined;
  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv
  };

  if (aad) {
    algorithm.additionalData = aad;
  }

  const ciphertext = await getCrypto().subtle.encrypt(algorithm, key, encoder.encode(plaintext));
  const payload: EncryptedMessagePayload = {
    v: 1,
    kid: keyId,
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext)
  };

  if (additionalData) {
    payload.aad = additionalData;
  }

  return payload;
}

export async function decryptMessage(payload: EncryptedMessagePayload, key: CryptoKey) {
  const algorithm: AesGcmParams = {
    name: "AES-GCM",
    iv: fromBase64Url(payload.iv)
  };

  if (payload.aad) {
    algorithm.additionalData = encoder.encode(payload.aad);
  }

  const plaintext = await getCrypto().subtle.decrypt(algorithm, key, fromBase64Url(payload.ciphertext));

  return decoder.decode(plaintext);
}

export function serializeEncryptedMessage(payload: EncryptedMessagePayload) {
  return JSON.stringify(payload);
}

export function deserializeEncryptedMessage(value: string): EncryptedMessagePayload {
  const parsed = JSON.parse(value) as Partial<EncryptedMessagePayload>;

  if (parsed.v !== 1 || typeof parsed.kid !== "string" || typeof parsed.iv !== "string" || typeof parsed.ciphertext !== "string") {
    throw new Error("Invalid encrypted message payload.");
  }

  return {
    v: 1,
    kid: parsed.kid,
    iv: parsed.iv,
    ciphertext: parsed.ciphertext,
    ...(parsed.aad ? { aad: parsed.aad } : {})
  };
}

export async function encryptDraft(plaintext: string, passphrase: string, iterations = DEFAULT_PBKDF2_ITERATIONS): Promise<EncryptedDraftPayload> {
  if (passphrase.length === 0) {
    throw new Error("Draft passphrase must not be empty.");
  }

  const subtle = getCrypto().subtle;
  const salt = getCrypto().getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const keyMaterial = await subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: KEY_LENGTH_BITS
    },
    false,
    ["encrypt"]
  );
  const iv = getCrypto().getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const ciphertext = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    encoder.encode(plaintext)
  );

  return {
    v: 1,
    kdf: "PBKDF2",
    hash: "SHA-256",
    alg: "AES-GCM",
    iterations,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(ciphertext)
  };
}

export async function decryptDraft(encrypted: EncryptedDraftPayload, passphrase: string) {
  if (encrypted.kdf !== "PBKDF2" || encrypted.hash !== "SHA-256" || encrypted.alg !== "AES-GCM") {
    throw new Error("Unsupported encrypted draft payload.");
  }

  const subtle = getCrypto().subtle;
  const keyMaterial = await subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  const key = await subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64Url(encrypted.salt),
      iterations: encrypted.iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: KEY_LENGTH_BITS
    },
    false,
    ["decrypt"]
  );
  const plaintext = await subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64Url(encrypted.iv)
    },
    key,
    fromBase64Url(encrypted.ciphertext)
  );

  return decoder.decode(plaintext);
}

export async function encryptDraftForStorage(plaintext: string, passphrase: string, iterations = DEFAULT_PBKDF2_ITERATIONS) {
  return encryptDraft(plaintext, passphrase, iterations);
}

export async function decryptDraftFromStorage(encrypted: EncryptedDraftPayload, passphrase: string) {
  return decryptDraft(encrypted, passphrase);
}

export function getDraftStorageKey(roomId?: string) {
  return roomId ? `tpt-hearth:draft:${roomId}` : "tpt-hearth:draft";
}

function getStorage(options?: DraftStorageOptions): Storage | undefined {
  if (options?.storage) {
    return options.storage;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function storeEncryptedDraft(encrypted: EncryptedDraftPayload, options: DraftStorageOptions = {}) {
  const storage = getStorage(options);

  if (!storage) {
    throw new Error("Encrypted draft storage is not available in this runtime.");
  }

  const storageKey = options.storageKey ?? getDraftStorageKey();
  storage.setItem(storageKey, JSON.stringify(encrypted));
  return storageKey;
}

export function readEncryptedDraft(options: DraftStorageOptions = {}): EncryptedDraftPayload | null {
  const storage = getStorage(options);
  const storageKey = options.storageKey ?? getDraftStorageKey();
  const serialized = storage?.getItem(storageKey);

  if (!serialized) {
    return null;
  }

  return deserializeEncryptedDraft(serialized);
}

export function removeEncryptedDraft(options: DraftStorageOptions = {}) {
  const storage = getStorage(options);
  const storageKey = options.storageKey ?? getDraftStorageKey();
  storage?.removeItem(storageKey);
}

export async function saveEncryptedDraft(plaintext: string, passphrase: string, options: DraftStorageOptions = {}) {
  const encrypted = await encryptDraft(plaintext, passphrase);
  return storeEncryptedDraft(encrypted, options);
}

export async function loadAndDecryptDraft(passphrase: string, options: DraftStorageOptions = {}) {
  const encrypted = readEncryptedDraft(options);

  if (!encrypted) {
    return null;
  }

  return decryptDraft(encrypted, passphrase);
}

export function deserializeEncryptedDraft(value: string): EncryptedDraftPayload {
  const parsed = JSON.parse(value) as Partial<EncryptedDraftPayload>;

  if (
    parsed.v !== 1 ||
    parsed.kdf !== "PBKDF2" ||
    parsed.hash !== "SHA-256" ||
    parsed.alg !== "AES-GCM" ||
    typeof parsed.iterations !== "number" ||
    typeof parsed.salt !== "string" ||
    typeof parsed.iv !== "string" ||
    typeof parsed.ciphertext !== "string"
  ) {
    throw new Error("Invalid encrypted draft payload.");
  }

  return {
    v: 1,
    kdf: "PBKDF2",
    hash: "SHA-256",
    alg: "AES-GCM",
    iterations: parsed.iterations,
    salt: parsed.salt,
    iv: parsed.iv,
    ciphertext: parsed.ciphertext
  };
}