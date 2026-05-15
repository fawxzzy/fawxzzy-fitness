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

test("consumeDiscordVerificationTokenForDiscordUser returns member-number and Discord identity fields on success", async () => {
  process.env.DISCORD_VERIFICATION_TOKEN_PEPPER = "test-pepper";

  const result = await consumeDiscordVerificationTokenForDiscordUser({
    token: "FWX-ABCD-EFGH",
    discordUserId: "123456789012345678",
    discordUsername: "zac",
    adminClient: {
      async rpc() {
        return {
          data: [{
            ok: true,
            user_id: "00000000-0000-0000-0000-000000000123",
            user_number: 12,
            user_kind: "human",
            expires_at: "2026-05-15T12:00:00.000Z",
            consumed_at: "2026-05-15T11:59:00.000Z",
            error: null,
          }],
          error: null,
        };
      },
    },
  });

  assert.deepEqual(result, {
    ok: true,
    memberId: "00000000-0000-0000-0000-000000000123",
    fitnessUserId: "00000000-0000-0000-0000-000000000123",
    userNumber: 12,
    userKind: "human",
    discordUserId: "123456789012345678",
    discordUsername: "zac",
  });
});
