# `tpt hearth` Encryption Notes

## Goal

Private rooms use end-to-end encryption by default. The MVP uses the Web Crypto API directly to avoid heavy dependencies and keep the implementation browser-native.

## Privacy modes

### `private_e2e`

- Messages are encrypted client-side.
- The server stores ciphertext only.
- The server can moderate metadata but not message contents.
- Room keys are generated and managed client-side.
- Local drafts can be encrypted before storage.

### `open_plaintext`

- Messages are stored server-side as plaintext.
- Used for open rooms that need Grove search and moderation review.
- Still excludes ads, tracking, behavioral analytics, and engagement metrics.

## Web Crypto primitives

Use:

- `crypto.subtle.generateKey`
- `crypto.subtle.exportKey`
- `crypto.subtle.importKey`
- `crypto.subtle.encrypt`
- `crypto.subtle.decrypt`
- AES-GCM
- 256-bit keys
- 12-byte random IVs

## Message envelope

Private-room messages should be stored as:

```ts
type EncryptedMessagePayload = {
  v: 1;
  kid: string;
  iv: string;
  ciphertext: string;
};
```

Where:

- `v` is the envelope version.
- `kid` is the room key version.
- `iv` is the base64url-encoded initialization vector.
- `ciphertext` is the base64url-encoded AES-GCM ciphertext.

## Room key flow

MVP flow:

1. User creates a private room.
2. Browser generates a room key.
3. Key is exported as raw or JWK material.
4. Key material is shared with invited members through a secure client-side path.
5. Messages are encrypted before being sent over WebSocket or API.
6. Recipients decrypt locally using the room key.

Future production flow should add proper group key management, rotation, and member revocation.

## Local encrypted drafts

PWA drafts should be encrypted before localStorage persistence.

Draft key derivation:

- Use a user-held draft passphrase or device-bound key.
- Derive encryption key with PBKDF2 or a Web Crypto key generation path.
- Store only encrypted draft material.

## Important limits

This scaffold intentionally uses a practical MVP encryption model.

It does not yet solve:

- full group membership revocation
- asynchronous key rotation
- multi-device key sync
- formal key transparency
- audited E2E protocol design

Those should be addressed before handling sensitive production communities.