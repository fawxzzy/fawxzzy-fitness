import assert from "node:assert/strict";
import test from "node:test";

import {
  dispatchDiscordDomainResponses,
  getDiscordInteractionCommandName,
  getDiscordInteractionCustomId,
  isDiscordApplicationCommand,
  isDiscordMessageComponent,
  isDiscordMessageComponentPrefix,
  isDiscordModalSubmit,
  isDiscordModalSubmitPrefix,
  toDiscordResponse,
} from "@/lib/discord/runtime/helpers";

test("runtime helpers read command names and custom ids safely from mixed Discord payloads", () => {
  assert.equal(getDiscordInteractionCommandName({ data: { name: "feedback" } }), "feedback");
  assert.equal(getDiscordInteractionCommandName({ data: { name: 42 } }), null);
  assert.equal(getDiscordInteractionCustomId({ data: { custom_id: "spotify_controls_open" } }), "spotify_controls_open");
  assert.equal(getDiscordInteractionCustomId({ data: { custom_id: 42 } }), null);
});

test("runtime helpers match application command, message component, and modal shapes", () => {
  assert.equal(isDiscordApplicationCommand({ type: 2, data: { name: "feedback" } }, "feedback"), true);
  assert.equal(isDiscordMessageComponent({ type: 3, data: { custom_id: "fitness_verify_open" } }, "fitness_verify_open"), true);
  assert.equal(isDiscordMessageComponentPrefix({ type: 3, data: { custom_id: "spotify_queue_view" } }, "spotify_"), true);
  assert.equal(isDiscordModalSubmit({ type: 5, data: { custom_id: "fitness_verify_modal" } }, "fitness_verify_modal"), true);
  assert.equal(isDiscordModalSubmitPrefix({ type: 5, data: { custom_id: "fitness_feedback_report_modal:bug" } }, "fitness_feedback_report_modal:"), true);
});

test("runtime helpers normalize JSON bodies and preserve concrete responses", async () => {
  const jsonResponse = (body: Record<string, unknown>) => new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  const normalizedResponse = toDiscordResponse(jsonResponse, { ok: true });
  assert.deepEqual(await normalizedResponse.json(), { ok: true });

  const passthroughResponse = new Response("already-response", { status: 202 });
  assert.equal(toDiscordResponse(jsonResponse, passthroughResponse), passthroughResponse);
});

test("runtime helpers return the first matching dispatcher response", async () => {
  const firstMiss = async () => null;
  const firstHit = async () => new Response("handled", { status: 200 });
  const secondHit = async () => new Response("should-not-run", { status: 200 });

  const response = await dispatchDiscordDomainResponses([firstMiss, firstHit, secondHit]);

  assert.ok(response instanceof Response);
  assert.equal(await response.text(), "handled");
});
