import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordOsFeedbackTransferPayload,
  getDiscordOsFeedbackTransferConfig,
  submitDiscordOsFeedbackTransfer,
} from "@/lib/discord/discordos-feedback-transfer";

test("DiscordOS feedback transfer config fails closed by default", () => {
  assert.deepEqual(getDiscordOsFeedbackTransferConfig({}), {
    enabled: false,
    mode: "fitness-primary",
    endpointUrl: null,
    transferSecret: null,
    blockedReasons: [],
  });
});

test("DiscordOS feedback transfer config requires an endpoint and transfer secret in primary mode", () => {
  assert.deepEqual(getDiscordOsFeedbackTransferConfig({
    DISCORDOS_FEEDBACK_TRANSFER_MODE: "discordos-primary",
  }), {
    enabled: false,
    mode: "discordos-primary",
    endpointUrl: null,
    transferSecret: null,
    blockedReasons: [
      "missing_discordos_feedback_transfer_endpoint_url",
      "missing_discordos_feedback_transfer_secret",
    ],
  });
});

test("DiscordOS feedback transfer payload marks Fitness live-transfer identity", () => {
  assert.deepEqual(buildDiscordOsFeedbackTransferPayload({
    interactionId: "interaction-1",
    reportType: "bug",
    reporterDiscordUserId: "123456789012345678",
    reporterUserKind: "human",
    summary: "Copy failed",
    area: "Settings",
    details: "The copy button did nothing.",
  }), {
    reportId: "fitness-live-transfer-interaction-1",
    reportType: "bug",
    reporterDiscordUserId: "123456789012345678",
    reporterUserKind: "human",
    transferSource: "fitness-discord-interaction",
    sourceProof: "discord-signature-verified-by-fitness",
    forumTitle: "Bug: Settings - Copy failed",
    statusNote: "The copy button did nothing.",
  });
});

test("DiscordOS feedback transfer posts to the configured endpoint", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const result = await submitDiscordOsFeedbackTransfer({
    interactionId: "interaction-1",
    reportType: "feature",
    reporterDiscordUserId: "123456789012345678",
    summary: "Add export",
    area: "History",
    details: "Export history as CSV.",
    endpointUrl: "https://fawxzzy-discordos.vercel.app/api/feedback-persist",
    transferSecret: "shared-transfer-secret",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({
        ok: true,
        persisted: true,
        liveTrafficMoved: true,
      }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://fawxzzy-discordos.vercel.app/api/feedback-persist");
  assert.equal(new Headers(calls[0].init.headers).get("x-discordos-feedback-transfer-secret"), "shared-transfer-secret");
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    reportId: "fitness-live-transfer-interaction-1",
    reportType: "feature",
    reporterDiscordUserId: "123456789012345678",
    reporterUserKind: "human",
    transferSource: "fitness-discord-interaction",
    sourceProof: "discord-signature-verified-by-fitness",
    forumTitle: "Feature: History - Add export",
    statusNote: "Export history as CSV.",
  });
});
