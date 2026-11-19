import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const RULES = fs.readFileSync('firestore.rules', 'utf8');
const BLUEPRINT = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

test('firestore.rules satisfies Eight Pillars structural & Dirty Dozen security assertions', () => {
  // 1. Rules version & global catch-all deny
  assert.ok(RULES.includes("rules_version = '2';"));
  assert.ok(RULES.includes('match /{document=**} {\n      allow read, write: if false;'));

  // 2. Verified Google auth requirement (blocks unauthenticated & email_verified=false)
  assert.ok(RULES.includes('request.auth != null'));
  assert.ok(RULES.includes('request.auth.token.email_verified == true'));

  // 3. Every blueprint collection is explicitly matched and secured
  for (const pathKey of Object.keys(BLUEPRINT.firestore)) {
    const matchPath = pathKey.replace(/^\//, '');
    assert.ok(RULES.includes(`match /${matchPath}`), `Missing match block for ${pathKey}`);
  }

  // 4. Strict schema allowlist, bounded strings, ID regex, server timestamps, terminal state lock
  assert.ok(RULES.includes('data.keys().hasAll(allowedKeys) && data.keys().hasOnly(allowedKeys)'));
  assert.ok(RULES.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  assert.ok(RULES.includes('incoming().createdAt == request.time'));
  assert.ok(RULES.includes('incoming().updatedAt == request.time'));
  assert.ok(RULES.includes("existing().status != 'finished'"));

  // 5. Partitioned host/guest score updates & anti-tampering score bounds
  assert.ok(RULES.includes("affectedKeys().hasOnly([\n              'hostScore'"));
  assert.ok(RULES.includes("affectedKeys().hasOnly([\n              'guestScore'"));
  assert.ok(RULES.includes('incoming().hostScore <= existing().hostScore + 260'));
  assert.ok(RULES.includes('incoming().guestScore <= existing().guestScore + 260'));

  // 6. Winner integrity check & private friend room list isolation
  assert.ok(RULES.includes('isValidWinnerForFinish()'));
  assert.ok(RULES.includes("existing().kind == 'quick' && existing().status == 'lobby' && existing().guestUid == ''"));
});
