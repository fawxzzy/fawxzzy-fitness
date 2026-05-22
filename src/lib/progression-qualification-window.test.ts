import assert from "node:assert/strict";
import test from "node:test";

import {
  countQualifiedSessions,
  isQualificationWindowSatisfied,
  normalizeQualificationWindow,
  resolveQualificationWindowStatus,
  type QualificationWindowEvidenceSession,
} from "@/lib/progression-qualification-window";

function buildEvidenceSession(args: Partial<QualificationWindowEvidenceSession> & Pick<QualificationWindowEvidenceSession, "sessionId" | "performedAt">): QualificationWindowEvidenceSession {
  return {
    qualified: false,
    ...args,
  };
}

test("default config preserves one-session latest behavior", () => {
  const evidence = [
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: true }),
  ];

  const status = resolveQualificationWindowStatus({ evidence });

  assert.equal(status.supported, true);
  assert.equal(status.satisfied, true);
  assert.equal(status.qualifiedCount, 1);
  assert.equal(status.requiredQualifiedSessions, 1);
});

test("normalization applies safe defaults and caps invalid values", () => {
  assert.deepEqual(normalizeQualificationWindow(undefined), {
    requiredQualifiedSessions: 1,
    mode: "latest",
    resetOnMiss: false,
  });
  assert.deepEqual(normalizeQualificationWindow({
    requiredQualifiedSessions: 99,
    mode: "bogus",
    resetOnMiss: "nope",
  }), {
    requiredQualifiedSessions: 5,
    mode: "latest",
    resetOnMiss: false,
  });
});

test("latest mode requires independent qualifying sessions", () => {
  const evidence = [
    buildEvidenceSession({ sessionId: "s2", performedAt: "2026-05-11T10:00:00.000Z", qualified: false }),
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: true }),
  ];

  const status = resolveQualificationWindowStatus({
    config: { requiredQualifiedSessions: 2, mode: "latest" },
    evidence,
  });

  assert.equal(status.satisfied, false);
  assert.equal(status.statusLine, "1 of 2 qualifying sessions complete");
});

test("latest mode becomes ready after two independent qualifying sessions", () => {
  const evidence = [
    buildEvidenceSession({ sessionId: "s2", performedAt: "2026-05-11T10:00:00.000Z", qualified: true }),
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: true }),
  ];

  assert.equal(isQualificationWindowSatisfied({
    config: { requiredQualifiedSessions: 2, mode: "latest" },
    evidence,
  }), true);
});

test("consecutive mode with resetOnMiss resets the latest streak", () => {
  const evidence = [
    buildEvidenceSession({ sessionId: "s3", performedAt: "2026-05-12T10:00:00.000Z", qualified: true }),
    buildEvidenceSession({ sessionId: "s2", performedAt: "2026-05-11T10:00:00.000Z", qualified: false }),
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: true }),
  ];

  const status = resolveQualificationWindowStatus({
    config: { requiredQualifiedSessions: 2, mode: "consecutive", resetOnMiss: true },
    evidence,
  });

  assert.equal(status.satisfied, false);
  assert.equal(status.streakReset, true);
  assert.equal(status.statusLine, "1 of 2 qualifying sessions complete · streak reset after miss");
});

test("consecutive mode without resetOnMiss preserves older qualifying streaks", () => {
  const evidence = [
    buildEvidenceSession({ sessionId: "s4", performedAt: "2026-05-13T10:00:00.000Z", qualified: false }),
    buildEvidenceSession({ sessionId: "s3", performedAt: "2026-05-12T10:00:00.000Z", qualified: true }),
    buildEvidenceSession({ sessionId: "s2", performedAt: "2026-05-11T10:00:00.000Z", qualified: true }),
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: false }),
  ];

  const status = resolveQualificationWindowStatus({
    config: { requiredQualifiedSessions: 2, mode: "consecutive", resetOnMiss: false },
    evidence,
  });

  assert.equal(status.satisfied, true);
  assert.deepEqual(status.matchedSessionIds, ["s3", "s2"]);
});

test("within_cycle counts only sessions inside the supplied cycle window", () => {
  const evidence = [
    buildEvidenceSession({ sessionId: "s3", performedAt: "2026-05-14T10:00:00.000Z", qualified: true }),
    buildEvidenceSession({ sessionId: "s2", performedAt: "2026-05-11T10:00:00.000Z", qualified: true }),
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-08T10:00:00.000Z", qualified: true }),
  ];

  const counted = countQualifiedSessions({
    config: { requiredQualifiedSessions: 2, mode: "within_cycle" },
    evidence,
    cycleWindow: {
      startDate: "2026-05-10",
      endDate: "2026-05-14T23:59:59.999Z",
    },
  });

  assert.equal(counted.supported, true);
  assert.equal(counted.qualifiedCount, 2);
  assert.deepEqual(counted.matchedSessionIds, ["s3", "s2"]);
});

test("within_cycle degrades safely when cycle window evidence is unavailable", () => {
  const status = resolveQualificationWindowStatus({
    config: { requiredQualifiedSessions: 2, mode: "within_cycle" },
    evidence: [
      buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: true }),
    ],
  });

  assert.equal(status.supported, false);
  assert.equal(status.satisfied, false);
  assert.equal(status.statusLine, "Qualification window needs cycle dates");
});

test("input evidence and config are not mutated", () => {
  const config = { requiredQualifiedSessions: 2, mode: "latest" as const, resetOnMiss: false };
  const evidence = [
    buildEvidenceSession({ sessionId: "s1", performedAt: "2026-05-10T10:00:00.000Z", qualified: true }),
  ];
  const configCopy = structuredClone(config);
  const evidenceCopy = structuredClone(evidence);

  resolveQualificationWindowStatus({ config, evidence });

  assert.deepEqual(config, configCopy);
  assert.deepEqual(evidence, evidenceCopy);
});
