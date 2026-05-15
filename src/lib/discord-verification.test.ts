import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDiscordVerificationExpiry,
  generateDiscordVerificationToken,
  hashDiscordVerificationToken,
  isValidDiscordVerificationToken,
  normalizeDiscordUserId,
  normalizeDiscordVerificationToken,
  resolveDiscordVerificationTokenTtlMinutes,
} from "./discord-verification.ts";

test("normalizeDiscordVerificationToken trims, uppercases, and removes separator noise", () => {
  assert.equal(
    normalizeDiscordVerificationToken("  fwx-abcd  efgh  "),
    "FWXABCDEFGH",
  );
});

test("hashDiscordVerificationToken changes when the token or pepper changes", () => {
  const first = hashDiscordVerificationToken("FWX-ABCD-EFGH", "pepper-one");
  const second = hashDiscordVerificationToken("FWX-ABCD-EFGH", "pepper-two");
  const third = hashDiscordVerificationToken("FWX-ABCD-IJKL", "pepper-one");

  assert.notEqual(first, second);
  assert.notEqual(first, third);
});

test("generateDiscordVerificationToken produces values accepted by the normalizer and validator", () => {
  const token = generateDiscordVerificationToken(() => Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]));
  const normalized = normalizeDiscordVerificationToken(token);

  assert.equal(token, "FWX-ABCD-EFGH");
  assert.equal(normalized, "FWXABCDEFGH");
  assert.equal(isValidDiscordVerificationToken(token), true);
  assert.equal(isValidDiscordVerificationToken(normalized), true);
});

test("normalizeDiscordUserId rejects invalid Discord user ids", () => {
  assert.equal(normalizeDiscordUserId(""), null);
  assert.equal(normalizeDiscordUserId("abc123"), null);
  assert.equal(normalizeDiscordUserId("1234"), null);
  assert.equal(normalizeDiscordUserId(" 123456789012345678 "), "123456789012345678");
});

test("calculateDiscordVerificationExpiry uses the default TTL and honors explicit overrides", () => {
  const now = new Date("2026-05-14T12:00:00.000Z");
  const defaultExpiry = calculateDiscordVerificationExpiry({ now });
  const overrideExpiry = calculateDiscordVerificationExpiry({ now, ttlMinutes: 30 });

  assert.equal(defaultExpiry.toISOString(), "2026-05-14T12:15:00.000Z");
  assert.equal(overrideExpiry.toISOString(), "2026-05-14T12:30:00.000Z");
  assert.equal(resolveDiscordVerificationTokenTtlMinutes(null), 15);
});
