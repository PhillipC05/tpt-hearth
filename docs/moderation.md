# `tpt hearth` Moderation Notes

## Goal

Moderation should be human-first, transparent, and non-algorithmic.

`tpt hearth` must not use:

- shadowbanning
- engagement-based amplification
- automated popularity ranking
- opaque recommendation systems
- manipulative friction

## MVP moderation tools

The scaffold includes:

- room-level rules
- user reports
- steward mute
- steward ban
- transparency logs
- admin review of non-E2E reports/logs

## Roles

### Member

A normal room participant.

Can:

- send messages according to room rules
- report harmful behavior
- leave the room

### Steward

A rotating caretaker, not an authoritarian admin.

Can:

- set room rules
- mute a user in the room
- ban a user from the room as a last resort
- archive a room gently
- view transparency-relevant room metadata

### Server admin

Operates the host/server.

Can:

- manage invites
- choose Porch mode
- toggle open/private room policy
- view non-E2E reports/logs
- manage server settings
- seed demo data

## Privacy boundary

Private E2E rooms do not expose message contents to the server.

Admins and stewards can moderate:

- reports
- metadata
- user conduct outside message contents
- open-room plaintext content
- room rules
- transparency logs

They cannot read private E2E message plaintext.

## Transparency log

Moderation actions should create a transparency log entry when appropriate.

Example fields:

- action ID
- public note
- actor role
- target scope
- created timestamp

The log should explain what happened without exposing private content.

## Recommended moderation flow

1. A member reports a concern.
2. Steward reads the report and relevant visible context.
3. Steward responds through dialogue where possible.
4. Mute is used before ban when appropriate.
5. Ban is last resort.
6. Action is logged.
7. Appeal/dialogue path remains available.

## Room rules examples

- Speak slowly; leave space.
- No harassment or targeted abuse.
- No unsolicited pressure.
- Respect silence.
- Step away kindly.
- Disagreement is welcome; domination is not.