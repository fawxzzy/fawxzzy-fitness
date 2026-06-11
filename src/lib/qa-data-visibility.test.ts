import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessQaLlelVisibilitySetting,
  canAccessQaLlelUi,
  filterQaLlelRows,
  hasQaLlelMarker,
  isQaLlelLabel,
  resolveQaLlelVisibilityOverride,
  resolveShowQaLlelDataPreference,
  resolveShowQaLlelDataPreferenceWithOverride,
} from "@/lib/qa-data-visibility";

test("recognizes QA and LLEL prefixes case-insensitively", () => {
  assert.equal(isQaLlelLabel("[ZAC-LLEL] Lower A"), true);
  assert.equal(isQaLlelLabel("  [qa-progression] Bench"), true);
  assert.equal(isQaLlelLabel("[QA-FULL-ROUTINE] Push"), true);
  assert.equal(isQaLlelLabel("Atlas Routine"), false);
});

test("finds QA markers across multiple labels", () => {
  assert.equal(hasQaLlelMarker(["Atlas Routine", "[QA-PROGRESSION] Bench"]), true);
  assert.equal(hasQaLlelMarker(["Atlas Routine", "Lower A"]), false);
});

test("defaults QA visibility on for automation users and Zac account, and off for other human users", () => {
  assert.equal(resolveShowQaLlelDataPreference({
    show_qa_llel_data: null,
    user_kind: "automation",
    user_number: null,
  }), true);
  assert.equal(resolveShowQaLlelDataPreference({
    show_qa_llel_data: null,
    user_kind: "human",
    user_number: 0,
  }), true);
  assert.equal(resolveShowQaLlelDataPreference({
    show_qa_llel_data: null,
    user_kind: "human",
    user_number: 7,
  }), false);
  assert.equal(resolveShowQaLlelDataPreference({
    show_qa_llel_data: true,
    user_kind: "human",
    user_number: 7,
  }), true);
});

test("resolves cookie-style QA visibility overrides before profile defaults", () => {
  assert.equal(resolveQaLlelVisibilityOverride("1"), true);
  assert.equal(resolveQaLlelVisibilityOverride("0"), false);
  assert.equal(resolveQaLlelVisibilityOverride("wat"), null);

  assert.equal(resolveShowQaLlelDataPreferenceWithOverride({
    show_qa_llel_data: null,
    user_kind: "human",
    user_number: 7,
  }, true), true);
  assert.equal(resolveShowQaLlelDataPreferenceWithOverride({
    show_qa_llel_data: true,
    user_kind: "human",
    user_number: 7,
  }, false), false);
  assert.equal(resolveShowQaLlelDataPreferenceWithOverride({
    show_qa_llel_data: null,
    user_kind: "automation",
    user_number: null,
  }, null), true);
});

test("limits QA/LLEL UI access to automation users and Zac account", () => {
  assert.equal(canAccessQaLlelUi({
    user_kind: "automation",
    user_number: null,
  }), true);
  assert.equal(canAccessQaLlelUi({
    user_kind: "human",
    user_number: 0,
  }), true);
  assert.equal(canAccessQaLlelUi({
    user_kind: "human",
    user_number: 7,
  }), false);
  assert.equal(canAccessQaLlelUi({
    user_kind: "unknown",
    user_number: null,
  }), false);
});

test("limits QA visibility setting to Zac account only", () => {
  assert.equal(canAccessQaLlelVisibilitySetting({
    user_number: 0,
  }), true);
  assert.equal(canAccessQaLlelVisibilitySetting({
    user_number: null,
  }), false);
  assert.equal(canAccessQaLlelVisibilitySetting({
    user_number: 7,
  }), false);
});

test("filters QA rows from human-facing lists", () => {
  const rows = [
    { id: "routine-1", name: "Atlas Routine" },
    { id: "routine-2", name: "[QA-FULL-ROUTINE] Push" },
    { id: "routine-3", name: "[ZAC-LLEL] Lower A" },
  ];

  assert.deepEqual(
    filterQaLlelRows(rows, (row) => [row.name]).map((row) => row.id),
    ["routine-1"],
  );
});
