import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_PAIN_FEEDBACK_MAX_PAGES,
  CURATED_PAIN_FEEDBACK_PAGE_SIZE,
  CURATED_RECENT_FEEDBACK_LIMIT,
  loadCuratedHistorySignals,
} from "./history-signals.ts";

type Row = { copilot_feedback_signal: string; exercise: { name: string } };

function fakeClient(rows: Row[], opts: { failPain?: boolean; failEffort?: boolean } = {}) {
  const log: Array<{ signals: string[]; limit?: number; range?: [number, number] }> = [];
  return {
    log,
    client: {
      from(table: string) {
        assert.equal(table, "session_exercises");
        const state: { signals: string[]; limit?: number; range?: [number, number] } = { signals: [] };
        const chain = {
          select: () => chain,
          eq: () => chain,
          in: (_col: string, values: string[]) => { state.signals = values; return chain; },
          order: () => chain,
          limit: (n: number) => { state.limit = n; return chain; },
          range: (a: number, b: number) => { state.range = [a, b]; return chain; },
          then(resolve: (value: unknown) => void) {
            log.push({ ...state });
            const isPain = state.signals.includes("pain_flag");
            if ((isPain && opts.failPain) || (!isPain && opts.failEffort)) {
              return resolve({ data: null, error: { message: "boom" } });
            }
            let data = rows.filter((row) => state.signals.includes(row.copilot_feedback_signal));
            if (state.range) data = data.slice(state.range[0], state.range[1] + 1);
            if (state.limit !== undefined) data = data.slice(0, state.limit);
            return resolve({ data, error: null });
          },
        };
        return chain;
      },
    },
  };
}

test("pain flags older than the 40 most recent feedback rows still exclude their exercise", async () => {
  const rows: Row[] = [];
  for (let i = 0; i < 60; i += 1) rows.push({ copilot_feedback_signal: "too_hard", exercise: { name: `Hard Lift ${i}` } });
  rows.push({ copilot_feedback_signal: "pain_flag", exercise: { name: "Back Squat" } });
  rows.push({ copilot_feedback_signal: "form_breakdown", exercise: { name: "Overhead Press" } });
  const { client } = fakeClient(rows);
  const signals = await loadCuratedHistorySignals({ userId: "u", supabase: client });
  assert.deepEqual(signals.painOrFormExerciseSlugs, ["back-squat", "overhead-press"]);
  assert.equal(signals.failedExerciseSlugs.length, CURATED_RECENT_FEEDBACK_LIMIT);
});

test("pain history is paged past one page", async () => {
  const rows: Row[] = [];
  for (let i = 0; i < CURATED_PAIN_FEEDBACK_PAGE_SIZE + 3; i += 1) {
    rows.push({ copilot_feedback_signal: "pain_flag", exercise: { name: `Lift ${i}` } });
  }
  const { client } = fakeClient(rows);
  const signals = await loadCuratedHistorySignals({ userId: "u", supabase: client });
  assert.equal(signals.painOrFormExerciseSlugs.length, CURATED_PAIN_FEEDBACK_PAGE_SIZE + 3);
});

test("a failed signal query throws instead of generating with no safety history", async () => {
  await assert.rejects(loadCuratedHistorySignals({ userId: "u", supabase: fakeClient([], { failPain: true }).client }), /pain feedback/);
  await assert.rejects(loadCuratedHistorySignals({ userId: "u", supabase: fakeClient([], { failEffort: true }).client }), /effort feedback/);
});

test("a pain history beyond the paging budget refuses to generate", async () => {
  const rows: Row[] = [];
  for (let i = 0; i < CURATED_PAIN_FEEDBACK_PAGE_SIZE * CURATED_PAIN_FEEDBACK_MAX_PAGES; i += 1) {
    rows.push({ copilot_feedback_signal: "pain_flag", exercise: { name: `Lift ${i}` } });
  }
  await assert.rejects(loadCuratedHistorySignals({ userId: "u", supabase: fakeClient(rows).client }), /paging budget/);
});
