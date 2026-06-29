import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSessionCopilotFeedbackUpdate,
  SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH,
} from "./session-copilot-feedback.ts";

test("buildSessionCopilotFeedbackUpdate normalizes signal and note and stamps updates", () => {
  const result = buildSessionCopilotFeedbackUpdate(
    {
      signal: "too_hard",
      note: "  Felt   rough   today  ",
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.deepEqual(result, {
    signal: "too_hard",
    note: "Felt rough today",
    updatedAt: "2026-06-29T12:00:00.000Z",
  });
});

test("buildSessionCopilotFeedbackUpdate keeps note-only feedback as a saved update", () => {
  const result = buildSessionCopilotFeedbackUpdate(
    {
      signal: "not-real",
      note: "only note",
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.deepEqual(result, {
    signal: null,
    note: "only note",
    updatedAt: "2026-06-29T12:00:00.000Z",
  });
});

test("buildSessionCopilotFeedbackUpdate clears updatedAt when both signal and note are empty", () => {
  const result = buildSessionCopilotFeedbackUpdate(
    {
      signal: null,
      note: "   ",
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.deepEqual(result, {
    signal: null,
    note: null,
    updatedAt: null,
  });
});

test("buildSessionCopilotFeedbackUpdate truncates notes to the contract cap", () => {
  const result = buildSessionCopilotFeedbackUpdate(
    {
      signal: "completed_as_planned",
      note: "x".repeat(SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH + 25),
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.equal(result.note?.length, SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH);
  assert.equal(result.updatedAt, "2026-06-29T12:00:00.000Z");
});
