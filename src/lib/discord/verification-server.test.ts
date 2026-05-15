import assert from "node:assert/strict";
import test from "node:test";
import { consumeDiscordVerificationTokenForDiscordUser } from "./verification-server.ts";

test("consumeDiscordVerificationTokenForDiscordUser does not echo raw tokens in invalid-input failures", async () => {
  const token = "FWX-LEAK-TOKEN";
  const result = await consumeDiscordVerificationTokenForDiscordUser({
    token,
    discordUserId: "123456789012345678",
  });

  assert.deepEqual(result, {
    ok: false,
    code: "DISCORD_VERIFICATION_INVALID_INPUT",
  });
  assert.equal(JSON.stringify(result).includes(token), false);
});
