import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDiscordMemberNickname,
  shouldDisplayDiscordMemberNumber,
} from "./member-number.ts";

test("formatDiscordMemberNickname prefixes a human member number", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "Zac" }),
    "#12 · Zac",
  );
});

test("formatDiscordMemberNickname supports reserved member number zero when profile truth provides it", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 0, currentDisplayName: "Zac" }),
    "#0 · Zac",
  );
});

test("shouldDisplayDiscordMemberNumber rejects automation and unknown users", () => {
  assert.equal(shouldDisplayDiscordMemberNumber({ userKind: "automation", userNumber: 12 }), false);
  assert.equal(shouldDisplayDiscordMemberNumber({ userKind: "unknown", userNumber: 12 }), false);
});

test("formatDiscordMemberNickname replaces an existing member-number prefix", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "#9 · Zac" }),
    "#12 · Zac",
  );
});

test("formatDiscordMemberNickname trims long names safely to Discord nickname limits", () => {
  const nickname = formatDiscordMemberNickname({
    userNumber: 12,
    currentDisplayName: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
  });

  assert.equal(nickname.length, 32);
  assert.equal(nickname.startsWith("#12 · "), true);
});

test("formatDiscordMemberNickname falls back to Member when the current display name is missing", () => {
  assert.equal(
    formatDiscordMemberNickname({ userNumber: 12, currentDisplayName: "   " }),
    "#12 · Member",
  );
});
