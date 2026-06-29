import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSessionCopilotFeedbackUpdate,
  SESSION_COPILOT_FEEDBACK_EFFORT_MAX,
  SESSION_COPILOT_FEEDBACK_EFFORT_MIN,
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
    effort: null,
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
    effort: null,
    updatedAt: "2026-06-29T12:00:00.000Z",
  });
});

test("buildSessionCopilotFeedbackUpdate keeps effort-only feedback as a saved update", () => {
  const result = buildSessionCopilotFeedbackUpdate(
    {
      signal: null,
      note: "   ",
      effort: 8,
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.deepEqual(result, {
    signal: null,
    note: null,
    effort: 8,
    updatedAt: "2026-06-29T12:00:00.000Z",
  });
});

test("buildSessionCopilotFeedbackUpdate clears updatedAt when signal, note, and effort are empty", () => {
  const result = buildSessionCopilotFeedbackUpdate(
    {
      signal: null,
      note: "   ",
      effort: null,
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.deepEqual(result, {
    signal: null,
    note: null,
    effort: null,
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
  assert.equal(result.effort, null);
  assert.equal(result.updatedAt, "2026-06-29T12:00:00.000Z");
});

test("buildSessionCopilotFeedbackUpdate clamps invalid effort out of the saved payload", () => {
  const tooLow = buildSessionCopilotFeedbackUpdate(
    {
      signal: "completed_as_planned",
      note: null,
      effort: SESSION_COPILOT_FEEDBACK_EFFORT_MIN - 1,
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  const tooHigh = buildSessionCopilotFeedbackUpdate(
    {
      signal: "completed_as_planned",
      note: null,
      effort: SESSION_COPILOT_FEEDBACK_EFFORT_MAX + 1,
    },
    () => "2026-06-29T12:00:00.000Z",
  );

  assert.equal(tooLow.effort, null);
  assert.equal(tooHigh.effort, null);
});
