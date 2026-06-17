# `tpt hearth` PWA Notes

## Goal

The PWA should feel like a quiet lodge that can be installed and revisited gently.

It should not behave like an engagement machine.

## MVP PWA requirements

- Install prompt
- Offline cached UI shell
- Local encrypted draft storage
- Push notification support prepared but disabled by default
- No red badges
- No urgent notification copy

## Files

```txt
apps/web/public/manifest.webmanifest
apps/web/public/sw.js
apps/web/public/icon.svg
apps/web/src/components/PwaProvider.tsx
```

## Service worker behavior

The service worker should cache:

- app shell
- manifest
- icons
- static CSS/JS emitted by Next.js
- previously visited UI routes where safe

It should not cache sensitive private-room message plaintext unless explicitly encrypted and managed by the app layer.

## Offline behavior

Offline mode should allow:

- viewing cached UI
- composing letters
- saving encrypted local drafts
- returning to previously loaded rooms where data is cached

Offline mode should clearly indicate when messages cannot be sent yet.

## Notification philosophy

Notifications are disabled by default.

If enabled later, they should be:

- opt-in
- batched gently
- acoustic/soft in tone
- free of red urgency badges
- user-controlled

Example copy:

- `The porch is open, if you'd like company.`
- `A letter is waiting for morning.`
- `Your room is quiet. No need to return unless you want to.`