// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";

import {
  claimDiscordMessageCommand,
  finalizeDiscordMessageCommandClaim,
  isDiscordMessageCommandClaimStoreConfigured,
} from "./message-command-claims.ts";

test("Discord message command claims bypass the store when Supabase admin env is missing", async () => {
  const result = await claimDiscordMessageCommand({
    channelId: "channel-1",
    messageId: "message-1",
    commandKind: "grand-rising",
    env: {},
  });

  assert.deepEqual(result, {
    ok: true,
    claimed: true,
    skippedStore: true,
  });
  assert.equal(isDiscordMessageCommandClaimStoreConfigured({}), false);
});

test("Discord message command claims return claimed=false on duplicate insert", async () => {
  const client = {
    from() {
      return {
        async insert() {
          return {
            error: {
              code: "23505",
              status: 409,
              message: "duplicate key value violates unique constraint",
            },
          };
        },
      };
    },
  };

  const result = await claimDiscordMessageCommand({
    channelId: "channel-1",
    messageId: "message-1",
    commandKind: "grand-rising",
    adminClient: client,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NODE_ENV: "production",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    claimed: false,
    skippedStore: false,
  });
});

test("Discord message command claim finalization records completion fields", async () => {
  let updatePayload = null;
  let updateFilters = [];
  const client = {
    from() {
      return {
        update(values) {
          updatePayload = values;
          return {
            eq(column, value) {
              updateFilters.push([column, value]);
              return this;
            },
          };
        },
      };
    },
  };

  const result = await finalizeDiscordMessageCommandClaim({
    channelId: "channel-1",
    messageId: "message-1",
    claimStatus: "completed",
    resultCode: null,
    responseAction: "posted",
    adminClient: client,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      NODE_ENV: "production",
    },
  });

  assert.deepEqual(result, {
    ok: true,
    skippedStore: false,
  });
  assert.equal(updatePayload.claim_status, "completed");
  assert.equal(updatePayload.response_action, "posted");
  assert.equal(typeof updatePayload.processed_at, "string");
  assert.deepEqual(updateFilters, [
    ["channel_id", "channel-1"],
    ["message_id", "message-1"],
  ]);
});
