import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Banned UI words (wave 2 "make it simple", SIMPLIFY.md section 7 glossary). Once a term is gone from the app, it
 * stays gone: this test fails if it comes back anywhere in user-facing source.
 *
 * Scope: every .ts/.tsx file under src/, except tests and the dev fixtures under src/app/dev (not shipped to people).
 * Matching is case-insensitive and literal, so CSS-uppercased labels ("TIME (S)") are caught as well. Comments are
 * skipped (block comments, JSX comment blocks and whole-line `//` comments, via stripSourceComments), so only copy
 * in strings and JSX text counts; a trailing `//` comment after code is still scanned.
 *
 * HOW TO EXTEND: when your PR removes a glossary term from the UI, move it from PENDING_GLOSSARY_TERMS into
 * BANNED_UI_TERMS in the same PR, with what to say instead. Only list a term once `git grep -i` finds it nowhere in
 * the scope above, so this file never fails another lane's PR.
 *
 * "Session" -> "Workout" (Zac decision 1) is deliberately NOT here: code, DB, routes and many identifiers keep
 * `session`, so a word test would be noise. Screens own that rename in their own copy tests.
 */
export const BANNED_UI_TERMS: ReadonlyArray<{ term: string; sayInstead: string }> = [
  { term: "Total stored records", sayInstead: "Remove, or a plain count under Details" },
  { term: "Set Optional", sayInstead: "Bonus day (not counted if skipped)" },
  { term: "Build / Select", sayInstead: "Tap the row, or Create your own" },
];

/**
 * Still on screen on main (2026-11-26), owned by other lanes or later work. Not asserted. Move a term up into
 * BANNED_UI_TERMS when it is gone.
 */
export const PENDING_GLOSSARY_TERMS: ReadonlyArray<{ term: string; sayInstead: string; seenIn: string }> = [
  { term: "Resync", sayInstead: "Same as last time / Reset", seenIn: "SetLoggerCard, SetLoggerControls, ExerciseInfoSheet" },
  { term: "Use Last", sayInstead: "Same as last time", seenIn: "SetLoggerCard, ExercisePicker, exercise-picker/goal" },
  { term: "Clear last", sayInstead: "Reset", seenIn: "SetLoggerCard, ExercisePicker, exercise-picker/goal" },
  { term: "Measurement Labels", sayInstead: "Units", seenIn: "RoutineEditorForm" },
  { term: "Routine Type", sayInstead: "Schedule: Weekly / Every N days", seenIn: "RoutineEditorForm, NewRoutineDraftForm" },
  { term: "#-based", sayInstead: "Every N days", seenIn: "RoutineEditorForm" },
  { term: "Week-based", sayInstead: "Weekly", seenIn: "RoutineEditorForm, RoutineHomeClient, routine-day-cycle" },
  { term: "Routine length", sayInstead: "Repeats every N days", seenIn: "RoutineEditorForm, NewRoutineDraftForm" },
  { term: "start anchor", sayInstead: "Starts on", seenIn: "CreateRoutineDayClient" },
  { term: "Manage cycle settings", sayInstead: "Remove (lives in Routine settings, More options)", seenIn: "CreateRoutineDayClient" },
  { term: "Planned training day", sayInstead: "Training day", seenIn: "RoutineDayKindReviewPanel" },
  { term: "Auto Apply Updates", sayInstead: "Also apply to exercises already in this routine", seenIn: "ProgressionPlaybookEditor" },
  { term: "TIME (S)", sayInstead: "Time (m:ss)", seenIn: "ProgressionPlaybookEditor, measurement-metric-labels" },
  { term: "Event mix", sayInstead: "Remove, or under Details", seenIn: "progression-history-display" },
  { term: "Monthly activity", sayInstead: "Remove, or under Details", seenIn: "progression-history-display" },
  { term: "Total events", sayInstead: "Remove, or under Details", seenIn: "progression-dashboard-copy, progression-history-display" },
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(repoRoot, "src");
const devRoot = path.join(srcRoot, "app", "dev");

function listUserFacingSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (full === devRoot || entry.name === "node_modules") continue;
      listUserFacingSourceFiles(full, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

// Drops block comments (JSX comment blocks too) and whole-line `//` comments; a trailing `//` stays, so URLs in strings survive.
export function stripSourceComments(text: string) {
  return text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("banned and pending lists are well formed and never overlap", () => {
  const banned = BANNED_UI_TERMS.map((entry) => entry.term.toLowerCase());
  const pending = PENDING_GLOSSARY_TERMS.map((entry) => entry.term.toLowerCase());
  assert.equal(new Set(banned).size, banned.length, "no duplicate banned terms");
  assert.equal(new Set(pending).size, pending.length, "no duplicate pending terms");
  for (const term of banned) {
    assert.ok(!pending.includes(term), `"${term}" is both banned and pending; keep it in one list`);
  }
  for (const entry of [...BANNED_UI_TERMS, ...PENDING_GLOSSARY_TERMS]) {
    assert.ok(entry.term.trim().length >= 3, "terms are real words, not fragments");
    assert.ok(entry.sayInstead.trim().length > 0, `"${entry.term}" says what to use instead`);
  }
  assert.ok(!banned.some((term) => /\bsessions?\b/.test(term)), "Session -> Workout stays out of this word test");
});

test("comments are skipped, copy in strings and JSX text is not", () => {
  const source = [
    "// We removed the old Set Optional card.",
    "/** Was: Build / Select */",
    "const url = \"https://example.com/a\"; // trailing note",
    "<p>{/* Total stored records */}Bonus day</p>",
    "const label = \"Set Optional\";",
  ].join("\n");
  const stripped = stripSourceComments(source);
  assert.ok(stripped.includes("https://example.com/a"), "URLs inside strings survive");
  assert.ok(!/Build \/ Select|Total stored records/.test(stripped), "block comments are dropped");
  assert.equal(stripped.match(/Set Optional/g)?.length, 1, "only the real string is left");
});

test("no banned glossary term appears in user-facing source", () => {
  const files = listUserFacingSourceFiles(srcRoot);
  assert.ok(files.length > 100, "the scan found the app source");
  const offenders: string[] = [];
  for (const file of files) {
    const text = stripSourceComments(readFileSync(file, "utf8"));
    for (const { term, sayInstead } of BANNED_UI_TERMS) {
      if (new RegExp(escapeRegExp(term), "i").test(text)) {
        offenders.push(`${path.relative(repoRoot, file)}: "${term}" (say instead: ${sayInstead})`);
      }
    }
  }
  assert.deepEqual(offenders, [], `retired UI words came back:\n${offenders.join("\n")}`);
});
