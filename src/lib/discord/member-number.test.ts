import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDiscordMemberNickname,
  shouldDisplayDiscordMemberNumber,
} from "./member-number.ts";

test("formatDiscordMemberNickname formats a human member number as username first", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "Zac" }),
    "Zac · 12",
  );
});

test("formatDiscordMemberNickname supports reserved member number zero when profile truth provides it", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 0, currentDisplayName: "Zac" }),
    "Zac · 0",
  );
});

test("shouldDisplayDiscordMemberNumber rejects automation and unknown users", () => {
  assert.equal(shouldDisplayDiscordMemberNumber({ userKind: "automation", userNumber: 12 }), false);
  assert.equal(shouldDisplayDiscordMemberNumber({ userKind: "unknown", userNumber: 12 }), false);
});

test("formatDiscordMemberNickname removes an existing member-number prefix", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "#9 · Zac" }),
    "Zac · 12",
  );
});

test("formatDiscordMemberNickname removes an existing member-number suffix", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "Zac · 9" }),
    "Zac · 12",
  );
});

test("formatDiscordMemberNickname trims long names safely and keeps the suffix visible", () => {
  const nickname = formatDiscordMemberNickname({
    userNumber: 12,
    currentDisplayName: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
  });

  assert.equal(nickname.length, 32);
  assert.equal(nickname.endsWith(" · 12"), true);
});

test("formatDiscordMemberNickname falls back to Member when the current display name is missing", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "   " }),
    "Member · 12",
  );
});
