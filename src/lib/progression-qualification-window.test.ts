import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateQualificationWindow,
  normalizeQualificationWindowConfig,
  type QualificationSessionEvidence,
} from "@/lib/progression-qualification-window";

function buildEvidence(items: Array<Partial<QualificationSessionEvidence> & Pick<QualificationSessionEvidence, "sessionId" | "qualified">>) {
  return items.map((item, index) => ({
    sessionId: item.sessionId,
    qualified: item.qualified,
    performedAt: item.performedAt ?? `2026-05-0${index + 1}T12:00:00.000Z`,
    reason: item.reason,
  }));
}

test("default qualification window config preserves one-session latest behavior", () => {
  assert.deepEqual(normalizeQualificationWindowConfig(undefined), {
    requiredQualifiedSessions: 1,
    mode: "latest",
    resetOnMiss: false,
  });
});

test("invalid qualification window config falls back and clamps safely", () => {
  assert.deepEqual(normalizeQualificationWindowConfig({
    requiredQualifiedSessions: 0,
    mode: "bad-mode",
    resetOnMiss: "yes",
  }), {
    requiredQualifiedSessions: 1,
    mode: "latest",
    resetOnMiss: false,
  });

  assert.deepEqual(normalizeQualificationWindowConfig({
    requiredQualifiedSessions: 99,
    mode: "consecutive",
    resetOnMiss: true,
  }), {
    requiredQualifiedSessions: 5,
    mode: "consecutive",
    resetOnMiss: true,
  });
});

test("latest mode returns ready only after enough independently qualified sessions", () => {
  const oneOfTwo = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2 },
    evidence: buildEvidence([
      { sessionId: "a", qualified: true },
    ]),
  });
  assert.equal(oneOfTwo.ready, false);
  assert.equal(oneOfTwo.status, "partial");
  assert.equal(oneOfTwo.summary, "1 of 2 qualifying sessions complete");

  const twoOfTwo = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2 },
    evidence: buildEvidence([
      { sessionId: "a", qualified: true },
      { sessionId: "b", qualified: true },
    ]),
  });
  assert.equal(twoOfTwo.ready, true);
  assert.equal(twoOfTwo.status, "qualified");
  assert.equal(twoOfTwo.summary, "2 of 2 qualifying sessions complete");
});

test("consecutive mode counts consecutive successes from the latest evidence", () => {
  const result = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2, mode: "consecutive", resetOnMiss: true },
    evidence: buildEvidence([
      { sessionId: "latest", qualified: true },
      { sessionId: "older", qualified: true },
      { sessionId: "oldest", qualified: false },
    ]),
  });

  assert.equal(result.ready, true);
  assert.equal(result.status, "qualified");
  assert.equal(result.qualifiedSessions, 2);
});

test("consecutive mode resets streak on miss when configured", () => {
  const result = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2, mode: "consecutive", resetOnMiss: true },
    evidence: buildEvidence([
      { sessionId: "latest", qualified: false },
      { sessionId: "older", qualified: true },
      { sessionId: "oldest", qualified: true },
    ]),
  });

  assert.equal(result.ready, false);
  assert.equal(result.status, "not_qualified");
  assert.equal(result.summary, "Streak reset after miss");
});

test("consecutive mode without reset keeps deterministic historical count", () => {
  const result = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2, mode: "consecutive", resetOnMiss: false },
    evidence: buildEvidence([
      { sessionId: "latest", qualified: false },
      { sessionId: "older", qualified: true },
      { sessionId: "oldest", qualified: true },
    ]),
  });

  assert.equal(result.ready, true);
  assert.equal(result.status, "qualified");
  assert.equal(result.qualifiedSessions, 2);
});

test("within-cycle mode counts only evidence inside the supplied cycle window", () => {
  const result = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2, mode: "within_cycle" },
    cycleWindow: { startDate: "2026-05-02", endDate: "2026-05-05" },
    evidence: buildEvidence([
      { sessionId: "outside", qualified: true, performedAt: "2026-05-01T12:00:00.000Z" },
      { sessionId: "inside-1", qualified: true, performedAt: "2026-05-03T12:00:00.000Z" },
      { sessionId: "inside-2", qualified: true, performedAt: "2026-05-04T12:00:00.000Z" },
    ]),
  });

  assert.equal(result.ready, true);
  assert.equal(result.status, "qualified");
  assert.equal(result.qualifiedSessions, 2);
});

test("within-cycle mode degrades safely when no cycle window is available", () => {
  const result = evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2, mode: "within_cycle" },
    evidence: buildEvidence([
      { sessionId: "a", qualified: true },
    ]),
  });

  assert.equal(result.ready, false);
  assert.equal(result.status, "unsupported");
  assert.equal(result.summary, "Cycle window unavailable");
});

test("qualification window helpers do not mutate input evidence", () => {
  const evidence = buildEvidence([
    { sessionId: "a", qualified: true },
    { sessionId: "b", qualified: false },
  ]);
  const snapshot = structuredClone(evidence);

  evaluateQualificationWindow({
    config: { requiredQualifiedSessions: 2, mode: "latest" },
    evidence,
  });

  assert.deepEqual(evidence, snapshot);
});
