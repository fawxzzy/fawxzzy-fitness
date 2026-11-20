import test from "node:test";
import assert from "node:assert/strict";

import {
  readSessionActionResult,
  runSessionAction,
  SESSION_RESUME_FAILED_MESSAGE,
  SESSION_START_FAILED_MESSAGE,
} from "./session-action-response.ts";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

test("readSessionActionResult passes a good JSON result through", async () => {
  const result = await readSessionActionResult<{ sessionId: string }>(
    jsonResponse(200, { ok: true, data: { sessionId: "s-1" } }),
    SESSION_START_FAILED_MESSAGE,
  );
  assert.deepEqual(result, { ok: true, data: { sessionId: "s-1" } });
});

test("readSessionActionResult keeps the server's own error text (an answered failure)", async () => {
  const result = await readSessionActionResult(jsonResponse(500, { ok: false, error: "No routine day is active." }), SESSION_START_FAILED_MESSAGE);
  assert.deepEqual(result, { ok: false, error: "No routine day is active." });
  assert.equal("unanswered" in result, false);
});

test("readSessionActionResult turns an HTML 500 page into the fallback instead of throwing", async () => {
  const response = new Response("<html><body>Internal Server Error</body></html>", { status: 500, headers: { "Content-Type": "text/html" } });
  const result = await readSessionActionResult(response, SESSION_RESUME_FAILED_MESSAGE);
  assert.deepEqual(result, { ok: false, error: SESSION_RESUME_FAILED_MESSAGE, unanswered: true });
});

test("readSessionActionResult rejects malformed and contradictory bodies", async () => {
  const unanswered = { ok: false, error: "fallback", unanswered: true };
  assert.deepEqual(await readSessionActionResult(jsonResponse(200, { sessionId: "s-1" }), "fallback"), unanswered);
  assert.deepEqual(await readSessionActionResult(jsonResponse(200, null), "fallback"), unanswered);
  assert.deepEqual(await readSessionActionResult(jsonResponse(503, { ok: true }), "fallback"), unanswered);
  assert.deepEqual(await readSessionActionResult(jsonResponse(400, { ok: false, error: "  " }), "fallback"), { ok: false, error: "fallback" });
});

test("runSessionAction turns a dropped connection into the fallback", async () => {
  const result = await runSessionAction(async () => {
    throw new TypeError("Failed to fetch");
  }, SESSION_START_FAILED_MESSAGE);
  assert.deepEqual(result, { ok: false, error: SESSION_START_FAILED_MESSAGE, unanswered: true });
});

test("fallback copy stays one short sentence pair under the 90-character toast limit", () => {
  for (const message of [SESSION_START_FAILED_MESSAGE, SESSION_RESUME_FAILED_MESSAGE]) {
    assert.ok(message.length <= 90, message);
  }
});
