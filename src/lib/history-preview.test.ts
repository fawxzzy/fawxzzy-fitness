import assert from "node:assert/strict";
import test from "node:test";

import {
  HISTORY_PREVIEW_PRIMARY_SESSION_ID,
  getHistoryPreviewDetailPageData,
  getHistoryPreviewExerciseRows,
  getHistoryPreviewLinks,
  getHistoryPreviewSessionsPageData,
  isHistoryPreviewAllowedHost,
  normalizeHistoryPreviewTarget,
} from "@/lib/history-preview-fixtures";

test("history preview host guard stays localhost-only", () => {
  assert.equal(isHistoryPreviewAllowedHost("localhost:3000"), true);
  assert.equal(isHistoryPreviewAllowedHost("127.0.0.1:3001"), true);
  assert.equal(isHistoryPreviewAllowedHost("[::1]:3000"), true);
  assert.equal(isHistoryPreviewAllowedHost("fitness.local"), false);
  assert.equal(isHistoryPreviewAllowedHost("preview.vercel.app"), false);
});

test("history preview target normalization blocks non-history redirects", () => {
  assert.equal(normalizeHistoryPreviewTarget(undefined), "/history");
  assert.equal(normalizeHistoryPreviewTarget("/history"), "/history");
  assert.equal(
    normalizeHistoryPreviewTarget(`/history/${HISTORY_PREVIEW_PRIMARY_SESSION_ID}?returnTab=sessions`),
    `/history/${HISTORY_PREVIEW_PRIMARY_SESSION_ID}?returnTab=sessions`,
  );
  assert.equal(normalizeHistoryPreviewTarget("https://example.com"), "/history");
  assert.equal(normalizeHistoryPreviewTarget("/settings"), "/history");
  assert.equal(normalizeHistoryPreviewTarget("//evil.example/history"), "/history");
});

test("history preview fixtures stay deterministic across the three QA entry routes", () => {
  const links = getHistoryPreviewLinks();
  assert.deepEqual(
    links.map((link) => link.href),
    ["/history", "/history/exercises", `/history/${HISTORY_PREVIEW_PRIMARY_SESSION_ID}`],
  );

  const sessionsPageData = getHistoryPreviewSessionsPageData();
  assert.equal(sessionsPageData.sessionItems.length, 3);
  assert.equal(sessionsPageData.selectedSessionId, HISTORY_PREVIEW_PRIMARY_SESSION_ID);
  assert.equal(sessionsPageData.weeklyProgress.completedWorkoutCount, 1);
  assert.equal(sessionsPageData.weeklyProgressByWeek.length, 2);

  const exerciseRows = getHistoryPreviewExerciseRows();
  assert.equal(exerciseRows.length, 3);
  assert.equal(exerciseRows.some((row) => row.kind === "cardio"), true);

  const detailData = getHistoryPreviewDetailPageData(HISTORY_PREVIEW_PRIMARY_SESSION_ID);
  assert.ok(detailData);
  assert.equal(detailData?.sessionSummary.id, HISTORY_PREVIEW_PRIMARY_SESSION_ID);
  assert.equal(detailData?.exercises.length, 4);
  assert.equal(getHistoryPreviewDetailPageData("unknown-session"), null);
});
