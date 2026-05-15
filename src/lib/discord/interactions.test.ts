import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordPongResponse,
  buildDiscordVerifyModalResponse,
  buildDiscordVerifyMessagePayload,
  discordMemberHasSetupPermission,
  extractDiscordModalTextInputValue,
  resolveDiscordVerifyMessageBody,
} from "./interactions.ts";

test("buildDiscordPongResponse returns Discord PONG type", () => {
  assert.deepEqual(buildDiscordPongResponse(), { type: 1 });
});

test("buildDiscordVerifyModalResponse returns the expected modal payload", () => {
  const response = buildDiscordVerifyModalResponse();

  assert.equal(response.type, 9);
  assert.equal(response.data.custom_id, "fitness_verify_modal");
  assert.equal(response.data.components[0]?.components[0]?.custom_id, "fitness_token");
});

test("extractDiscordModalTextInputValue reads the submitted token from Discord component rows", () => {
  const token = extractDiscordModalTextInputValue([
    {
      type: 1,
      components: [
        {
          type: 4,
          custom_id: "fitness_token",
          value: "FWX-ABCD-EFGH",
        },
      ],
    },
  ]);

  assert.equal(token, "FWX-ABCD-EFGH");
});

test("resolveDiscordVerifyMessageBody converts escaped newlines into rendered lines", () => {
  assert.equal(
    resolveDiscordVerifyMessageBody("Line 1\\nLine 2"),
    "Line 1\nLine 2",
  );
});

test("buildDiscordVerifyMessagePayload includes the verify button", () => {
  const payload = buildDiscordVerifyMessagePayload();

  assert.equal(payload.components[0]?.components[0]?.custom_id, "fitness_verify_open");
});

test("discordMemberHasSetupPermission accepts administrator and manage guild bitfields", () => {
  assert.equal(discordMemberHasSetupPermission(String(BigInt(1) << BigInt(3))), true);
  assert.equal(discordMemberHasSetupPermission(String(BigInt(1) << BigInt(5))), true);
  assert.equal(discordMemberHasSetupPermission("0"), false);
});
