# Security Specification — FLAGVERSE Online 1v1 Multiplayer

## 1. Data Invariants
1. **Verified Identity Required**: Every read and write on `/onlineRooms/{roomId}` requires a verified Firebase Google user (`request.auth != null && request.auth.token.email_verified == true`). No PII (email, phone, address) is ever stored in `/onlineRooms`.
2. **Path & Document ID Integrity**: `{roomId}` must match `^[a-zA-Z0-9_\-]+$` (4..32 chars) and equal `incoming().roomId`.
3. **Immutable Ownership & Timestamps**: `roomId`, `kind`, `hostUid`, and `createdAt` can never change after creation; `createdAt == request.time` on create and `updatedAt == request.time` on every write.
4. **Private Friend Room Isolation**: Rooms with `kind == 'friend'` can NEVER be listed by non-participants. A friend can only fetch a friend room via direct `get` using the exact secret 6-character code while `status == 'lobby' && guestUid == ''`.
5. **Action-Based Partitioned Updates**:
   - Host can ONLY mutate `host*` score fields during `playing`; Guest can ONLY mutate `guest*` score fields during `playing`.
   - Only the Host can change `modeId`/`durationSeconds` or start a Friend Room.
   - Only a non-host user can claim an open `guestUid == ''` seat, setting `guestUid == request.auth.uid`.
6. **Terminal State Locking**: Once `status == 'finished'`, NO subsequent updates are permitted on the document.
7. **Strict Schema & Bounds**: Every write validates exact key membership (`hasAll` + `hasOnly`), exact types, bounded string lengths, bounded integer ranges (`0..50000` score, `0..60` answers/streaks), and valid enums.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Write**: Create `/onlineRooms/K7M9P2` with `request.auth == null`.
2. **Unverified Email Spoof**: Write with `request.auth.uid = 'u1'` but `email_verified: false`.
3. **Host Identity Spoofing**: User `u2` tries to create a room with `hostUid: 'u1'`.
4. **Shadow / Ghost Field Injection**: Create or update a room with extra field `isAdmin: true`.
5. **ID Poisoning**: Create a room with a 200-char or slash-injected `{roomId}`.
6. **Private Friend Room Scraping (`list`)**: Stranger `u3` lists `/onlineRooms` attempting to discover `kind == 'friend'` rooms.
7. **Opponent Score Tampering**: Host (`u1`) attempts to modify `guestScore: 0` during `playing`.
8. **State Shortcutting**: Host creates a room already in `status: 'playing'` or `status: 'finished'`.
9. **Terminal State Mutation**: Participant attempts to overwrite `winnerUid` or `hostScore` after `status == 'finished'`.
10. **Value Poisoning**: Guest tries to set `guestScore: 999999999` or `guestScore: "hacked"` or `guestName` > 24 chars.
11. **Client Timestamp Forgery**: Create room with backdated `createdAt` instead of `request.time`.
12. **Guest Mode Hijack**: Guest (`u2`) attempts to change `modeId` or start a Friend Room owned by Host (`u1`).
