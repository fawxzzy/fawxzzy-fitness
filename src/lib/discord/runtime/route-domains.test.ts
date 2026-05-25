import test from "node:test";
import assert from "node:assert/strict";

import { dispatchModerationInteraction } from "@/lib/discord/runtime/domains/moderation";
import { dispatchOperationsInteraction } from "@/lib/discord/runtime/domains/operations";
import { dispatchSpotifyInteraction } from "@/lib/discord/runtime/domains/spotify";
import { dispatchUpdatesInteraction } from "@/lib/discord/runtime/domains/updates";
import { dispatchVerificationInteraction } from "@/lib/discord/runtime/domains/verification";
import {
  DISCORD_INTERACTION_TYPE,
  FITNESS_MOD_LOG_COMMAND_NAME,
  FITNESS_PURGATORY_COMMAND_NAME,
  FITNESS_SPOTIFY_COMMAND_NAME,
  FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX,
  FITNESS_VERIFY_BUTTON_CUSTOM_ID,
} from "@/lib/discord/interactions";
import type { DiscordInteraction } from "@/lib/discord/runtime/types";

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify(body), init);
}

function appCommandInteraction(name: string): DiscordInteraction {
  return {
    type: DISCORD_INTERACTION_TYPE.APPLICATION_COMMAND,
    data: { name },
  };
}

test("verification dispatch opens the verify modal from the stable button id", async () => {
  const response = await dispatchVerificationInteraction({
    interaction: {
      type: DISCORD_INTERACTION_TYPE.MESSAGE_COMPONENT,
      data: { custom_id: FITNESS_VERIFY_BUTTON_CUSTOM_ID },
    },
    jsonResponse,
    buildDiscordVerifyModalResponse: () => ({ type: "verify-modal" }),
    handleSetupVerifyInteraction: async () => ({ ok: true }),
    handleVerifyCleanupInteraction: async () => ({ ok: true }),
    handleVerifyLockdownInteraction: async () => ({ ok: true }),
    handleVerifyModalSubmit: async () => ({ ok: true }),
  });

  assert.ok(response instanceof Response);
  assert.deepEqual(await response.json(), { type: "verify-modal" });
});

test("spotify dispatch preserves command routing without requiring a new runtime owner", async () => {
  const response = await dispatchSpotifyInteraction({
    interaction: appCommandInteraction(FITNESS_SPOTIFY_COMMAND_NAME),
    jsonResponse,
    handleSetupSpotifyClubInteraction: async () => ({ ok: true }),
    handleSpotifyInteraction: async () => ({ domain: "spotify" }),
    handleJamLobbyInteraction: async () => ({ ok: true }),
    handleJamQueueInteraction: async () => ({ ok: true }),
    handleSpotifyClubButtonInteraction: async () => ({ ok: true }),
    handleSpotifyQueueSuggestModalSubmit: async () => ({ ok: true }),
    handleSpotifyQueueSearchModalSubmit: async () => ({ ok: true }),
  });

  assert.ok(response instanceof Response);
  assert.deepEqual(await response.json(), { domain: "spotify" });
});

test("moderation dispatch keeps purgatory routing in the current Fitness owner", async () => {
  const response = await dispatchModerationInteraction({
    interaction: appCommandInteraction(FITNESS_PURGATORY_COMMAND_NAME),
    jsonResponse,
    handleWarnInteraction: async () => ({ ok: true }),
    handleWarningsInteraction: async () => ({ ok: true }),
    handleWarningClearInteraction: async () => ({ ok: true }),
    handlePurgatorySetupInteraction: async () => ({ ok: true }),
    handlePurgatoryInteraction: async () => ({ domain: "purgatory" }),
  });

  assert.ok(response instanceof Response);
  assert.deepEqual(await response.json(), { domain: "purgatory" });
});

test("operations dispatch isolates release-log style commands from other domains", async () => {
  const response = await dispatchOperationsInteraction({
    interaction: appCommandInteraction(FITNESS_MOD_LOG_COMMAND_NAME),
    jsonResponse,
    handleReleaseInteraction: async () => ({ ok: true }),
    handleModLogInteraction: async () => ({ domain: "mod-log" }),
    handleServerInventoryInteraction: async () => ({ ok: true }),
  });

  assert.ok(response instanceof Response);
  assert.deepEqual(await response.json(), { domain: "mod-log" });
});

test("updates dispatch preserves publish modal handling inside Fitness", async () => {
  const response = await dispatchUpdatesInteraction({
    interaction: {
      type: DISCORD_INTERACTION_TYPE.MODAL_SUBMIT,
      data: { custom_id: `${FITNESS_UPDATE_PUBLISH_MODAL_CUSTOM_ID_PREFIX}:draft_123` },
    },
    jsonResponse,
    handleUpdateLatestInteraction: async () => ({ ok: true }),
    handleUpdatePublishInteraction: async () => ({ ok: true }),
    handleUpdateSkipInteraction: async () => ({ ok: true }),
    handleUpdatePublishModalSubmit: async () => ({ domain: "updates" }),
  });

  assert.ok(response instanceof Response);
  assert.deepEqual(await response.json(), { domain: "updates" });
});

test("domain dispatchers return null when an interaction belongs elsewhere", async () => {
  const response = await dispatchOperationsInteraction({
    interaction: appCommandInteraction("not-an-ops-command"),
    jsonResponse,
    handleReleaseInteraction: async () => ({ ok: true }),
    handleModLogInteraction: async () => ({ ok: true }),
    handleServerInventoryInteraction: async () => ({ ok: true }),
  });

  assert.equal(response, null);
});
