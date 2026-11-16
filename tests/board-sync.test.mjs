import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  appendUpdateLine, canonicalJson, completedProblems, dueStatus, DEFAULT_POLICY, eventId, FITNESS_PROFILE, foldEvents, KEEP_UPDATE_LINES, parseJsonl, validateEventShape, withId,
} from "../scripts/board/board-events.mjs";
import {
  appendEvent, ARCHIVE_PATH, checkIntegrity, computePlan, computeStatus, EXPORT_PATH, flushLocal, formatPlan, localFallbackPath, readRemoteEvents, REGISTRY_PATH, runBoardSync,
} from "../scripts/board/board-sync.mjs";
import { patchRegistryText, renderItem } from "../scripts/board/registry-text.mjs";
import { PUBLIC_TEXT_SCREENS, screenMatches } from "../scripts/board/public-text-screens.mjs";
import { repinWeb, WEB_FILES, WEB_NEXT_COMMANDS } from "../scripts/board/web-repin.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const PR_REPO = "fawxzzy/fawxzzy-fitness";
const tmp = (label) => fs.mkdtempSync(path.join(os.tmpdir(), `fitness-board-sync-${label}-`));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const writeJsonl = (dir, events) => { const file = path.join(dir, "events.jsonl"); fs.writeFileSync(file, events.map((e) => `${canonicalJson(withId(e))}\n`).join("")); return file; };

const item = (id, status, extra = {}, card = true) => ({
  id, status, updatedAt: "2026-11-01T00:00:00.000Z", ...extra,
  ...(card ? { card: { title: `Card ${id}`, priority: "P2", dependsOn: [], description: "Base text.", acceptanceCriteria: ["a", "b", "c"] } } : {}),
});
const registry = () => ({
  schemaVersion: 1, projectId: "fitness", state: "active", updatedAt: "2026-11-01T00:00:00.000Z",
  provenance: { note: "fixture" },
  acceptedPublicCardIds: ["FF-A-002"],
  workItems: [
    item("FF-A-001", "planning", { visibility: "public" }),
    item("FF-A-002", "fixed", { visibility: "public" }),
    item("FF-A-003", "review", { visibility: "private" }),
    item("FF-A-004", "in_progress"),
    item("FF-A-005", "confirmed", {}, false),
    item("FF-A-006", "fixed", {}, false),
    item("FF-A-007", "fawxzzy_review", { visibility: "public" }),
  ],
});
const wrap = (events) => events.map((event, index) => ({ event, source: "test", line: index + 1 }));
const merged = (n, mergedSha = "abcdef1234567") => ({ prs: [{ repo: PR_REPO, number: n, mergedSha }] });
const done = { prs: [{ repo: PR_REPO, number: 7, mergedSha: "abcdef1234567" }], deployedBuild: "fitness-prod-1", headless: true, deviceChecked: false };
const ev = (card, ts, extra = {}) => ({ v: 1, ts, card, text: "Work moved.", ...extra });
const fold = (events, reg = registry(), priorEvents = []) => foldEvents({ registry: reg, events: wrap(events), priorEvents });

// ---- identity, shape, screens -----------------------------------------------------------------------------------------------

test("card ids are parameterised: Fitness FF ids pass, other projects' ids and malformed ids fail", () => {
  assert.deepEqual(validateEventShape(ev("FF-RET-006", "2026-11-14T10:00:00Z")), []);
  for (const bad of ["MAZER-UI-001", "FF-ret-001", "FF-RET-01", "FF-RET-0001", "ff-ret-001", "FF-1-001"]) {
    assert.match(validateEventShape(ev(bad, "2026-11-14T10:00:00Z")).join(), /FF-AREA-NNN/, bad);
  }
  assert.equal(FITNESS_PROFILE.cardId.source, "^FF-[A-Z]+-[0-9]{3}$");
});

test("event ids are content hashes: stable, ignore id and by, change with content", () => {
  const e = ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "review" });
  assert.equal(eventId(e), eventId({ ...e, by: "someone", id: "ignored" }));
  assert.notEqual(eventId(e), eventId({ ...e, text: "Other." }));
  assert.match(eventId(e), /^[0-9a-f]{12}$/);
});

test("shape: unknown fields, bad status, vocabulary without blocked or deferred, urls and public-text screens are refused", () => {
  const base = ev("FF-A-001", "2026-11-14T10:00:00Z");
  assert.match(validateEventShape({ ...base, surprise: 1 }).join(), /unknown field/);
  for (const status of ["blocked", "deferred", "fixed", "confirmed", "done"]) assert.match(validateEventShape({ ...base, status }).join(), /status must be one of planning, in_progress, review, completed/, status);
  assert.match(validateEventShape({ ...base, text: "See https://example.com now." }).join(), /URL or a file path/);
  assert.match(validateEventShape({ ...base, text: "Rotated the api key." }).join(), /public-text/);
  assert.match(validateEventShape({ ...base, text: "Board update 2026-11-14: faked line." }).join(), /reserved/);
  assert.match(validateEventShape({ ...base, ts: "yesterday" }).join(), /ISO UTC/);
  assert.match(validateEventShape({ ...base, evidence: { prs: [{ repo: "fawxzzy/mazer", number: 1 }] } }).join(), /repo must be one of fawxzzy\/fawxzzy-fitness, fawxzzy\/FawxzzyWeb/);
  assert.ok(PUBLIC_TEXT_SCREENS.length >= 9);
  assert.equal(screenMatches("Plain safe words.").length, 0);
});

test("a new card needs an explicit visibility and at least three criteria; replacement fields are for existing cards only", () => {
  const n = { title: "New Thing", description: "Does a thing.", priority: "P2", dependencies: [], acceptanceCriteria: ["a", "b", "c"], visibility: "public" };
  assert.deepEqual(validateEventShape(ev("FF-A-050", "2026-11-14T10:00:00Z", { status: "planning", new: n })), []);
  const { visibility: _v, ...noVis } = n;
  assert.match(validateEventShape(ev("FF-A-050", "2026-11-14T10:00:00Z", { new: noVis })).join(), /new\.visibility/);
  assert.match(validateEventShape(ev("FF-A-050", "2026-11-14T10:00:00Z", { new: { ...n, acceptanceCriteria: ["a"] } })).join(), /at least 3/);
  assert.match(validateEventShape(ev("FF-A-050", "2026-11-14T10:00:00Z", { new: n, description: "x" })).join(), /new card uses new.description/);
});

// ---- status map -------------------------------------------------------------------------------------------------------------

test("status map: completed -> fixed, review -> review, in_progress and planning map to themselves", () => {
  assert.deepEqual({ ...FITNESS_PROFILE.statusToRegistry }, { planning: "planning", in_progress: "in_progress", review: "review", completed: "fixed" });
  const events = [
    ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "in_progress" }),
    ev("FF-A-004", "2026-11-14T10:01:00Z", { status: "review", evidence: merged(3) }),
    ev("FF-A-003", "2026-11-14T10:02:00Z", { status: "completed", evidence: done }),
  ];
  const result = fold(events);
  assert.deepEqual(result.errors, []);
  const by = new Map(result.registry.workItems.map((i) => [i.id, i.status]));
  assert.equal(by.get("FF-A-001"), "in_progress");
  assert.equal(by.get("FF-A-004"), "review");
  assert.equal(by.get("FF-A-003"), "fixed");
  assert.deepEqual(result.changes.map((c) => [c.card, c.from, c.to]), [["FF-A-001", "planning", "in_progress"], ["FF-A-004", "in_progress", "review"], ["FF-A-003", "review", "fixed"]]);
});

test("a fixed card does not move back without reopen: true; confirmed and fawxzzy_review read as review", () => {
  const back = fold([ev("FF-A-002", "2026-11-14T10:00:00Z", { status: "in_progress" })]);
  assert.match(back.errors.join(), /reopen/);
  const reopened = fold([ev("FF-A-002", "2026-11-14T10:00:00Z", { status: "in_progress", reopen: true })]);
  assert.deepEqual(reopened.errors, []);
  assert.equal(reopened.registry.workItems.find((i) => i.id === "FF-A-002").status, "in_progress");
  assert.equal(FITNESS_PROFILE.registryToEvent.confirmed, "review");
  assert.equal(FITNESS_PROFILE.registryToEvent.fawxzzy_review, "review");
  assert.equal(FITNESS_PROFILE.registryToEvent.fixed, "completed");
});

test("completed needs a merged PR and a deployed build, unless the work has no runtime surface", () => {
  assert.match(completedProblems("FF-A-001", { prs: [], headless: false, deviceChecked: false }).join(), /merged PR/);
  assert.match(completedProblems("FF-A-001", { prs: [{ repo: PR_REPO, number: 1, mergedSha: "abcdef1" }], headless: true, deviceChecked: false }).join(), /deployedBuild/);
  assert.deepEqual(completedProblems("FF-A-001", { prs: [{ repo: PR_REPO, number: 1, mergedSha: "abcdef1" }], headless: true, deviceChecked: null }), []);
  const refused = fold([ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "completed", evidence: merged(1) })]);
  assert.match(refused.errors.join(), /deployedBuild/);
  assert.equal(refused.registry.workItems.find((i) => i.id === "FF-A-001").status, "planning", "a refused event changes nothing");
});

test("evidence from archived events counts: a later completed event can rely on an earlier merged PR", () => {
  const prior = withId(ev("FF-A-001", "2026-11-13T10:00:00Z", { status: "review", evidence: merged(9) }));
  const result = fold([ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "completed", evidence: { deployedBuild: "fitness-prod-2", headless: true, deviceChecked: false } })], registry(), [prior]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.registry.workItems.find((i) => i.id === "FF-A-001").status, "fixed");
});

// ---- card store folding -----------------------------------------------------------------------------------------------------

test("the fold writes the update line into the registry card description and keeps only the newest three", () => {
  const events = [1, 2, 3, 4].map((n) => ev("FF-A-001", `2026-11-1${n}T10:00:00Z`, { status: "in_progress", text: `Step ${n}.` }));
  const result = fold(events);
  assert.deepEqual(result.errors, []);
  const description = result.registry.workItems.find((i) => i.id === "FF-A-001").card.description;
  assert.equal(description.match(/Board update /g).length, KEEP_UPDATE_LINES);
  assert.match(description, /^Base text\. Board update 2026-11-12: Step 2\./);
  assert.doesNotMatch(description, /Step 1\./);
  assert.equal(result.registry.workItems.find((i) => i.id === "FF-A-001").updatedAt, "2026-11-14T10:00:00.000Z");
  assert.equal(result.registry.updatedAt, "2026-11-14T10:00:00.000Z");
  assert.equal(appendUpdateLine("Base. Board update 2026-01-01: a. Board update 2026-01-02: b. Board update 2026-01-03: c.", "Board update 2026-01-04: d").match(/Board update /g).length, 3);
});

test("evidence wording is generated from the evidence: merged-not-deployed, headless-only and device checks are stated", () => {
  const review = fold([ev("FF-A-004", "2026-11-14T10:00:00Z", { status: "review", evidence: { ...merged(3), headless: true, deviceChecked: false } })]);
  const text = review.registry.workItems.find((i) => i.id === "FF-A-004").card.description;
  assert.match(text, /PR #3 merged \(abcdef12\)\. Merged, not deployed\. Checked only in headless Chromium, not on a real phone\./);
  const live = fold([ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "completed", evidence: { ...done, deviceChecked: true, checkedOn: "iPhone, build fitness-prod-1" } })]);
  assert.match(live.registry.workItems.find((i) => i.id === "FF-A-001").card.description, /Deployed: production build fitness-prod-1\. Checked on a real device: iPhone, build fitness-prod-1\./);
});

test("cards whose prose lives in a generated source change status only, with a warning; text replacement is refused", () => {
  const status = fold([ev("FF-A-005", "2026-11-14T10:00:00Z", { status: "in_progress" })]);
  assert.deepEqual(status.errors, []);
  assert.match(status.warnings.join(), /FF-A-005: only the status changes/);
  const it = status.registry.workItems.find((i) => i.id === "FF-A-005");
  assert.equal(it.status, "in_progress");
  assert.equal(it.card, undefined);
  assert.match(fold([ev("FF-A-005", "2026-11-14T10:00:00Z", { title: "Renamed" })]).errors.join(), /generated source file/);
});

test("corrective title, description and criteria replace registry card text", () => {
  const result = fold([ev("FF-A-001", "2026-11-14T10:00:00Z", { title: "Better Title", description: "Fresh text.", acceptanceCriteria: ["x1", "x2", "x3"] })]);
  assert.deepEqual(result.errors, []);
  const c = result.registry.workItems.find((i) => i.id === "FF-A-001").card;
  assert.equal(c.title, "Better Title");
  assert.match(c.description, /^Fresh text\. Board update /);
  assert.deepEqual(c.acceptanceCriteria, ["x1", "x2", "x3"]);
});

test("new cards are created in the registry card store with their visibility; duplicates, unknown dependencies and completed creation are refused", () => {
  const n = { title: "New Thing", description: "Does a thing.", priority: "P1", dependencies: ["FF-A-001"], acceptanceCriteria: ["a", "b", "c"], visibility: "public" };
  const result = fold([ev("FF-A-050", "2026-11-14T10:00:00Z", { status: "planning", new: n })]);
  assert.deepEqual(result.errors, []);
  const created = result.registry.workItems.at(-1);
  assert.deepEqual(created, { id: "FF-A-050", status: "planning", updatedAt: "2026-11-14T10:00:00.000Z", visibility: "public", card: { title: "New Thing", priority: "P1", dependsOn: ["FF-A-001"], description: "Does a thing.", acceptanceCriteria: ["a", "b", "c"] } });
  assert.match(fold([ev("FF-A-001", "2026-11-14T10:00:00Z", { new: n })]).errors.join(), /already exists/);
  assert.match(fold([ev("FF-A-050", "2026-11-14T10:00:00Z", { new: { ...n, dependencies: ["FF-NOPE-001"] } })]).errors.join(), /not a registry card/);
  assert.match(fold([ev("FF-A-050", "2026-11-14T10:00:00Z", { status: "completed", new: n, evidence: done })]).errors.join(), /cannot be created as completed/);
  assert.match(fold([ev("FF-A-099", "2026-11-14T10:00:00Z", { status: "review" })]).errors.join(), /not in the registry/);
});

// ---- allowlist upkeep -------------------------------------------------------------------------------------------------------

test("allowlist: a public card that reaches completed is added to acceptedPublicCardIds; no duplicates", () => {
  const result = fold([ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "completed", evidence: done })]);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.registry.acceptedPublicCardIds, ["FF-A-002", "FF-A-001"]);
  assert.equal(result.changes[0].allowlisted, true);
  // FF-A-002 is already accepted and fixed; reopening then completing again must not duplicate it.
  const again = fold([ev("FF-A-002", "2026-11-14T10:00:00Z", { status: "review", reopen: true }), ev("FF-A-002", "2026-11-14T11:00:00Z", { status: "completed", evidence: done })]);
  assert.deepEqual(again.errors, []);
  assert.deepEqual(again.registry.acceptedPublicCardIds, ["FF-A-002"]);
});

test("allowlist: private and visibility-less cards that complete are NOT added, with a warning", () => {
  const priv = fold([ev("FF-A-003", "2026-11-14T10:00:00Z", { status: "completed", evidence: done })]);
  assert.deepEqual(priv.registry.acceptedPublicCardIds, ["FF-A-002"]);
  assert.match(priv.warnings.join(), /visibility "private", so it stays off the public board/);
  const none = fold([ev("FF-A-004", "2026-11-14T10:00:00Z", { status: "completed", evidence: done })]);
  assert.deepEqual(none.registry.acceptedPublicCardIds, ["FF-A-002"]);
  assert.match(none.warnings.join(), /no explicit visibility/);
});

// ---- no-op and determinism --------------------------------------------------------------------------------------------------

test("zero events: the fold is a strict no-op and an already-applied event is skipped", () => {
  const reg = registry();
  const empty = fold([], reg);
  assert.deepEqual(empty.registry, reg);
  assert.deepEqual([empty.applied.length, empty.errors.length, empty.changes.length], [0, 0, 0]);
  const e = withId(ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "in_progress" }));
  const skipped = foldEvents({ registry: reg, events: wrap([e]), appliedIds: new Set([e.id]) });
  assert.equal(skipped.applied.length, 0);
  assert.deepEqual(skipped.registry, reg);
  assert.equal(skipped.skipped[0].reason, "already applied");
});

test("the fold is order independent for input order (timestamp order wins) and does not mutate its input", () => {
  const reg = registry();
  const before = canonicalJson(reg);
  const a = ev("FF-A-001", "2026-11-12T10:00:00Z", { status: "in_progress", text: "First." });
  const b = ev("FF-A-001", "2026-11-13T10:00:00Z", { status: "review", evidence: merged(2), text: "Second." });
  assert.equal(canonicalJson(fold([a, b], reg).registry), canonicalJson(fold([b, a], reg).registry));
  assert.equal(canonicalJson(reg), before);
});

test("an edited event (id no longer matches its content) is refused", () => {
  const e = withId(ev("FF-A-001", "2026-11-14T10:00:00Z", { status: "review", evidence: merged(1) }));
  const result = fold([{ ...e, text: "Edited after recording." }]);
  assert.match(result.errors.join(), /does not match the content/);
});

test("due policy is 12 events or 7 days", () => {
  assert.deepEqual({ ...DEFAULT_POLICY }, { minEvents: 12, maxAgeDays: 7 });
  const day = 86_400_000;
  const now = Date.parse("2026-11-20T00:00:00Z");
  const e = (ts) => ({ ts });
  assert.equal(dueStatus([], now).due, false);
  assert.equal(dueStatus(Array.from({ length: 11 }, () => e("2026-11-19T00:00:00Z")), now).due, false);
  assert.equal(dueStatus(Array.from({ length: 12 }, () => e("2026-11-19T00:00:00Z")), now).due, true);
  assert.equal(dueStatus([e(new Date(now - 6.9 * day).toISOString())], now).due, false);
  assert.equal(dueStatus([e(new Date(now - 7 * day).toISOString())], now).due, true);
});

test("parseJsonl reports malformed lines and ignores blanks", () => {
  const parsed = parseJsonl('{"a":1}\n\nnot json\n[1]\n', "src");
  assert.equal(parsed.events.length, 1);
  assert.equal(parsed.errors.length, 2);
});

// ---- registry text patching (the registry is hand-formatted) ---------------------------------------------------------------

const realRegistryRaw = fs.readFileSync(path.join(repoRoot, REGISTRY_PATH), "utf8");
const realRegistry = JSON.parse(realRegistryRaw);

test("every existing registry work item and the allowlist round-trip byte for byte through the style-preserving renderer", () => {
  const lf = realRegistryRaw.replace(/\r\n/g, "\n");
  for (const w of realRegistry.workItems) assert.ok(lf.includes(renderItem(w)), `${w.id} renders in the registry's own style`);
});

function pickCards() {
  const open = realRegistry.workItems.filter((w) => w.card && w.visibility === "public" && ["planning", "in_progress", "review"].includes(w.status));
  assert.ok(open.length >= 2, "needs two open public registry cards");
  return open;
}
const sampleEvents = (a, b) => [
  ev(a.id, "2099-01-01T10:00:00Z", { status: "completed", text: "Shipped.", evidence: done }),
  ev(b.id, "2099-01-01T10:05:00Z", { status: "review", text: "Merged for review.", evidence: { ...merged(8), headless: true, deviceChecked: false } }),
  ev("FF-ZZTEST-901", "2099-01-01T10:10:00Z", { status: "planning", text: "New card.", new: { title: "Check Screens", description: "Walk the main screens after each release.", priority: "P2", dependencies: [a.id], acceptanceCriteria: ["a1", "a2", "a3"], visibility: "public" } }),
];

test("patching the real registry touches only the changed blocks, the allowlist, updatedAt and provenance.boardSync", () => {
  const [a, b] = pickCards();
  const result = foldEvents({ registry: realRegistry, events: wrap(sampleEvents(a, b)) });
  assert.deepEqual(result.errors, []);
  result.registry.provenance = { ...result.registry.provenance, boardSync: { at: result.registry.updatedAt, appliedEventCount: 3, lastEventId: result.applied.at(-1).id } };
  const patched = patchRegistryText(realRegistryRaw, realRegistry, result.registry);
  assert.deepEqual(JSON.parse(patched), result.registry);
  assert.equal(patched.includes("\r\n"), realRegistryRaw.includes("\r\n"), "line endings are preserved");
  const oldLines = realRegistryRaw.replace(/\r\n/g, "\n").split("\n");
  const newLines = patched.replace(/\r\n/g, "\n").split("\n");
  const oldSet = new Set(oldLines);
  const added = newLines.filter((l) => !oldSet.has(l));
  assert.ok(added.length < 40, `only a small diff, got ${added.length} new lines`);
  assert.ok(newLines.length - oldLines.length < 40);
});

test("a second patch updates the existing provenance.boardSync line instead of adding another", () => {
  const [a] = pickCards();
  const first = foldEvents({ registry: realRegistry, events: wrap([ev(a.id, "2099-01-01T10:00:00Z", { status: "in_progress", text: "One." })]) });
  first.registry.provenance = { ...first.registry.provenance, boardSync: { at: first.registry.updatedAt, appliedEventCount: 1, lastEventId: first.applied[0].id } };
  const raw1 = patchRegistryText(realRegistryRaw, realRegistry, first.registry);
  const second = foldEvents({ registry: first.registry, events: wrap([ev(a.id, "2099-01-02T10:00:00Z", { status: "review", text: "Two.", evidence: merged(5) })]) });
  second.registry.provenance = { ...second.registry.provenance, boardSync: { at: second.registry.updatedAt, appliedEventCount: 2, lastEventId: second.applied[0].id } };
  const raw2 = patchRegistryText(raw1, first.registry, second.registry);
  assert.equal(raw2.match(/"boardSync"/g).length, 1);
  assert.deepEqual(JSON.parse(raw2), second.registry);
});

test("patcher handles last item changed, new item added, and both in one fold", () => {
  const lastId = realRegistry.workItems.at(-1).id;
  const changeLast = (reg) => { const r = structuredClone(reg); const l = r.workItems.at(-1); l.status = l.status === "review" ? "planning" : "review"; l.updatedAt = "2099-01-01T00:00:00.000Z"; return r; };
  const addNew = (reg) => { const r = structuredClone(reg); r.workItems.push({ ...structuredClone(r.workItems[0]), id: "FF-ZZTEST-902" }); return r; };
  const cases = { changeLast: changeLast(realRegistry), addNew: addNew(realRegistry), both: addNew(changeLast(realRegistry)) };
  for (const [name, expected] of Object.entries(cases)) {
    const patched = patchRegistryText(realRegistryRaw, realRegistry, expected);
    assert.deepEqual(JSON.parse(patched), expected, name);
    assert.equal(patched.includes("\r\n"), realRegistryRaw.includes("\r\n"), name);
  }
  assert.equal(cases.both.workItems.at(-2).id, lastId);
});

test("the patcher refuses text that is not in the registry's hand-written style instead of guessing", () => {
  const [a] = pickCards();
  const result = foldEvents({ registry: realRegistry, events: wrap([ev(a.id, "2099-01-01T10:00:00Z", { status: "in_progress", text: "One." })]) });
  const reformatted = JSON.stringify(realRegistry, null, 2);
  assert.throws(() => patchRegistryText(reformatted, realRegistry, result.registry), /not found exactly once|expected hand-written style/);
});

// ---- plan against the real repo (read-only) ---------------------------------------------------------------------------------

test("plan with zero pending events is a no-op: registry, archive and owner export are untouched", () => {
  const files = [REGISTRY_PATH, ARCHIVE_PATH, EXPORT_PATH].map((rel) => path.join(repoRoot, rel));
  const before = files.map(sha);
  const empty = path.join(tmp("empty"), "events.jsonl");
  fs.writeFileSync(empty, "");
  const plan = computePlan(repoRoot, { eventFiles: [empty] });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.outputs, null);
  assert.equal(plan.exportText, null);
  assert.match(formatPlan(plan), /nothing to apply/);
  const lines = [];
  assert.equal(runBoardSync(["plan", "--events", empty], repoRoot, (l) => lines.push(l)), 0);
  assert.match(lines.join("\n"), /dry run: nothing written/);
  assert.deepEqual(files.map(sha), before);
});

test("plan on sample events builds registry, archive and export outputs in memory and writes nothing", () => {
  const files = [REGISTRY_PATH, ARCHIVE_PATH, EXPORT_PATH].map((rel) => path.join(repoRoot, rel));
  const before = files.map(sha);
  const [a, b] = pickCards();
  const file = writeJsonl(tmp("plan"), sampleEvents(a, b));
  const plan = computePlan(repoRoot, { eventFiles: [file] });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.summary.events, 3);
  assert.deepEqual(plan.summary.newCards, ["FF-ZZTEST-901"]);
  assert.deepEqual(plan.summary.exportAdded, ["FF-ZZTEST-901"]);
  assert.deepEqual(Object.keys(plan.outputs).sort(), [ARCHIVE_PATH, REGISTRY_PATH].sort());
  assert.equal(JSON.parse(plan.exportText).cards.length, plan.summary.exportedCards);
  assert.match(formatPlan(plan), /\+acceptedPublicCardIds/);
  assert.deepEqual(files.map(sha), before);
});

// ---- status and check -------------------------------------------------------------------------------------------------------

test("status keeps the Board-as-of line format board-batch parses, and --due exits 3 when not due", () => {
  const status = computeStatus(repoRoot, { noRemote: true, eventFiles: [] }, Date.parse("2026-11-15T00:00:00Z"));
  assert.match(status.line, /^Board as of \d{4}-\d{2}-\d{2}(?: \(last sync [^)]+\))?, \d+ pending events?(?:, oldest [\d.]+ d)?\. (?:Not due\.|SYNC DUE: .*\.)$/);
  const lines = [];
  assert.equal(runBoardSync(["status", "--due", "--no-remote"], repoRoot, (l) => lines.push(l)), status.due ? 0 : 3);
});

test("check passes on the real repo (integrity plus the existing owner export check)", () => {
  const lines = [];
  assert.equal(runBoardSync(["check"], repoRoot, (l) => lines.push(l)), 0, lines.join("\n"));
  assert.match(lines.join("\n"), /board-sync check: ok/);
  assert.deepEqual(checkIntegrity(repoRoot).errors, []);
});

// ---- apply and check on a scratch copy of the repo's board files ------------------------------------------------------------

const COPY = [REGISTRY_PATH, ARCHIVE_PATH, EXPORT_PATH, "scripts/export-project-board-owner.mjs", "scripts/feedback-monetization-roadmap.mjs", "scripts/feedback-session-exercise-timer-cards.mjs"];
function scratchRepo() {
  const dir = tmp("repo");
  for (const rel of COPY) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.copyFileSync(path.join(repoRoot, rel), path.join(dir, rel)); }
  return dir;
}
const exporterRun = (cwd, args = []) => { try { return { ok: true, output: execFileSync(process.execPath, ["scripts/export-project-board-owner.mjs", ...args], { cwd, encoding: "utf8", stdio: "pipe" }) }; } catch (error) { return { ok: false, output: `${error.stdout}${error.stderr}` }; } };
const tools = (overrides = {}) => ({ ownerExportTools: { regenerate: (cwd) => exporterRun(cwd), check: (cwd) => exporterRun(cwd, ["--check"]), test: () => ({ ok: true, skipped: true, output: "" }), ...overrides } });

test("apply folds events into the registry card store, appends the archive and regenerates the owner export with the exporter", () => {
  const dir = scratchRepo();
  const [a, b] = pickCards();
  const events = writeJsonl(tmp("apply"), sampleEvents(a, b));
  const baseCount = JSON.parse(fs.readFileSync(path.join(dir, REGISTRY_PATH), "utf8")).provenance?.boardSync?.appliedEventCount ?? 0;
  const lines = [];
  assert.equal(runBoardSync(["apply", "--events", events], dir, (l) => lines.push(l), tools()), 0, lines.join("\n"));
  const registryAfter = JSON.parse(fs.readFileSync(path.join(dir, REGISTRY_PATH), "utf8"));
  const byId = new Map(registryAfter.workItems.map((w) => [w.id, w]));
  assert.equal(byId.get(a.id).status, "fixed");
  assert.ok(registryAfter.acceptedPublicCardIds.includes(a.id), "completed public card is allowlisted");
  assert.equal(byId.get(b.id).status, "review");
  assert.equal(byId.get("FF-ZZTEST-901").card.title, "Check Screens");
  assert.equal(registryAfter.provenance.boardSync.appliedEventCount, baseCount + 3);
  const archive = parseJsonl(fs.readFileSync(path.join(dir, ARCHIVE_PATH), "utf8")).events;
  assert.equal(archive.length, baseCount + 3);
  assert.ok(archive.every((x) => x.event.id === eventId(x.event)));
  const exported = JSON.parse(fs.readFileSync(path.join(dir, EXPORT_PATH), "utf8"));
  assert.ok(exported.cards.some((c) => c.record.card_id === "FF-ZZTEST-901"));
  assert.equal(exported.cards.find((c) => c.record.card_id === a.id).record.lifecycle, "completed");
  assert.equal(exporterRun(dir, ["--check"]).ok, true, "the existing exporter check passes on the result");
  assert.equal(checkIntegrity(dir).errors.length, 0, checkIntegrity(dir).errors.join("\n"));
  // The same events again are already applied: nothing changes.
  const hashes = COPY.map((rel) => sha(path.join(dir, rel)));
  const again = [];
  assert.equal(runBoardSync(["apply", "--events", events], dir, (l) => again.push(l), tools()), 0);
  assert.match(again.join("\n"), /nothing to apply/);
  assert.deepEqual(COPY.map((rel) => sha(path.join(dir, rel))), hashes);
});

test("apply restores every file when the owner export check fails on the folded result", () => {
  const dir = scratchRepo();
  const [a, b] = pickCards();
  const events = writeJsonl(tmp("restore"), sampleEvents(a, b));
  const before = COPY.map((rel) => sha(path.join(dir, rel)));
  const lines = [];
  const code = runBoardSync(["apply", "--events", events], dir, (l) => lines.push(l), tools({ check: () => ({ ok: false, output: "stale export" }) }));
  assert.equal(code, 2);
  assert.match(lines.join("\n"), /REFUSED.*owner-export:check.*restored/s);
  assert.deepEqual(COPY.map((rel) => sha(path.join(dir, rel))), before);
});

test("apply keeps its files but exits 4 and says so when only the pinned owner-export test fails", () => {
  const dir = scratchRepo();
  const [a, b] = pickCards();
  const events = writeJsonl(tmp("pins"), sampleEvents(a, b));
  const baseCount = JSON.parse(fs.readFileSync(path.join(dir, REGISTRY_PATH), "utf8")).provenance?.boardSync?.appliedEventCount ?? 0;
  const lines = [];
  const code = runBoardSync(["apply", "--events", events], dir, (l) => lines.push(l), tools({ test: () => ({ ok: false, output: "expected 41 cards" }) }));
  assert.equal(code, 4);
  assert.match(lines.join("\n"), /update the pinned expectations in tests\/project-board-owner-export\.test\.mjs in the SAME pull request/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, REGISTRY_PATH), "utf8")).provenance.boardSync.appliedEventCount, baseCount + 3);
});

test("apply refuses a plan with problems and writes nothing", () => {
  const dir = scratchRepo();
  const before = COPY.map((rel) => sha(path.join(dir, rel)));
  const events = writeJsonl(tmp("bad"), [ev("FF-ZZ-999", "2099-01-01T10:00:00Z", { status: "review" })]);
  const lines = [];
  assert.equal(runBoardSync(["apply", "--events", events], dir, (l) => lines.push(l), tools()), 2);
  assert.match(lines.join("\n"), /not in the registry/);
  assert.deepEqual(COPY.map((rel) => sha(path.join(dir, rel))), before);
});

test("check catches an edited archive line, a missing allowlist entry and a count mismatch", () => {
  const dir = scratchRepo();
  const [a, b] = pickCards();
  const events = writeJsonl(tmp("chk"), sampleEvents(a, b));
  assert.equal(runBoardSync(["apply", "--events", events], dir, () => {}, tools()), 0);
  const archivePath = path.join(dir, ARCHIVE_PATH);
  const good = fs.readFileSync(archivePath, "utf8");
  fs.writeFileSync(archivePath, good.replace("Shipped.", "Changed later."));
  assert.match(checkIntegrity(dir).errors.join(), /id does not match content/);
  fs.writeFileSync(archivePath, good.split("\n").slice(1).join("\n"));
  assert.match(checkIntegrity(dir).errors.join(), /does not match the archive/);
  fs.writeFileSync(archivePath, good);
  const registryPath = path.join(dir, REGISTRY_PATH);
  const reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  reg.acceptedPublicCardIds = reg.acceptedPublicCardIds.filter((id) => id !== a.id);
  fs.writeFileSync(registryPath, JSON.stringify(reg));
  assert.match(checkIntegrity(dir).errors.join(), /missing from acceptedPublicCardIds/);
});

// ---- event store on a real (local) git remote -------------------------------------------------------------------------------

function gitRepoWithRemote() {
  const bare = tmp("bare");
  execFileSync("git", ["init", "--bare", "--quiet", bare]);
  const work = tmp("work");
  execFileSync("git", ["init", "--quiet", work]);
  execFileSync("git", ["remote", "add", "origin", bare], { cwd: work });
  return { bare, work };
}

test("every board-events commit carries a vercel.json with git deployments off, so event pushes never spend the Vercel deploy cap", () => {
  const { bare, work } = gitRepoWithRemote();
  appendEvent(work, { v: 1, ts: "2026-12-01T10:00:00Z", card: "FF-A-001", text: "first" });
  appendEvent(work, { v: 1, ts: "2026-12-01T10:00:05Z", card: "FF-A-001", text: "second" });
  const names = execFileSync("git", ["--git-dir", bare, "ls-tree", "--name-only", "refs/heads/board-events"], { encoding: "utf8" }).trim().split(/\r?\n/).sort();
  assert.deepEqual(names, ["events.jsonl", "vercel.json"]);
  const vj = JSON.parse(execFileSync("git", ["--git-dir", bare, "show", "refs/heads/board-events:vercel.json"], { encoding: "utf8" }));
  assert.deepEqual(vj, { git: { deploymentEnabled: false } });
});

test("append writes one line to the board-events branch without touching the working tree; duplicates are no-ops", () => {
  const { work } = gitRepoWithRemote();
  const e = { v: 1, ts: "2026-12-01T10:00:00Z", card: "FF-A-001", text: "first" };
  assert.equal(appendEvent(work, e).pushed, 1);
  assert.equal(appendEvent(work, { ...e, ts: "2026-12-01T10:00:05Z", text: "second" }).pushed, 1);
  assert.equal(appendEvent(work, e).pushed, 0);
  const parsed = parseJsonl(readRemoteEvents(work)).events.map((x) => x.event);
  assert.deepEqual(parsed.map((x) => x.text), ["first", "second"]);
  assert.equal(parsed[0].id, eventId(parsed[0]));
  assert.equal(fs.readdirSync(work).filter((n) => n !== ".git").length, 0, "no files appear in the working tree");
});

test("an event for another project's card id is rejected before it is written anywhere", () => {
  const { work } = gitRepoWithRemote();
  assert.throws(() => appendEvent(work, { v: 1, ts: "2026-12-01T10:00:00Z", card: "MAZER-A-001", text: "wrong project" }), /FF-AREA-NNN/);
});

test("two clones appending alternately both land", () => {
  const { bare, work } = gitRepoWithRemote();
  const other = tmp("other");
  execFileSync("git", ["init", "--quiet", other]);
  execFileSync("git", ["remote", "add", "origin", bare], { cwd: other });
  appendEvent(work, { v: 1, ts: "2026-12-01T10:00:00Z", card: "FF-A-001", text: "from clone one" });
  appendEvent(other, { v: 1, ts: "2026-12-01T10:00:01Z", card: "FF-B-001", text: "from clone two" });
  appendEvent(work, { v: 1, ts: "2026-12-01T10:00:02Z", card: "FF-C-001", text: "from clone one again" });
  assert.equal(parseJsonl(readRemoteEvents(other)).events.length, 3);
});

test("offline append falls back to a local file in the git dir and flush pushes it later", () => {
  const { bare, work } = gitRepoWithRemote();
  const e = { v: 1, ts: "2026-12-01T10:00:00Z", card: "FF-A-001", text: "written offline" };
  execFileSync("git", ["remote", "set-url", "origin", path.join(bare, "does-not-exist")], { cwd: work });
  const r = appendEvent(work, e);
  assert.match(r.where, /local fallback/);
  assert.equal(fs.readFileSync(localFallbackPath(work), "utf8").trim().split("\n").length, 1);
  execFileSync("git", ["remote", "set-url", "origin", bare], { cwd: work });
  assert.equal(flushLocal(work).flushed, 1);
  assert.equal(parseJsonl(readRemoteEvents(work)).events[0].event.text, "written offline");
  assert.equal(fs.readFileSync(localFallbackPath(work), "utf8"), "");
});

// ---- FawxzzyWeb re-pin ------------------------------------------------------------------------------------------------------

test("web re-pin copies the Fitness export into the Web board sources and reports new and removed ids", () => {
  const web = tmp("web");
  const source = path.join(web, WEB_FILES.source);
  assert.match(WEB_FILES.source, /fitness\.project-board\.owner-export\.v1\.json$/);
  fs.mkdirSync(path.dirname(source), { recursive: true });
  const old = { cards: ["FF-A-001", "FF-GONE-001"].map((id) => ({ record: { card_id: id } })) };
  fs.writeFileSync(source, `${JSON.stringify(old, null, 2)}\n`);
  const exportPath = path.join(tmp("exp"), "export.json");
  const bytes = `${JSON.stringify({ cards: ["FF-A-001", "FF-B-001"].map((id) => ({ record: { card_id: id } })) }, null, 2)}\n`;
  fs.writeFileSync(exportPath, bytes);
  const dry = repinWeb({ webDir: web, exportPath, write: false });
  assert.deepEqual([dry.newIds, dry.removedIds, dry.cards], [["FF-B-001"], ["FF-GONE-001"], 2]);
  assert.equal(fs.readFileSync(source, "utf8"), `${JSON.stringify(old, null, 2)}\n`, "dry run writes nothing");
  repinWeb({ webDir: web, exportPath, write: true });
  assert.equal(fs.readFileSync(source, "utf8"), bytes);
  assert.ok(WEB_NEXT_COMMANDS.includes("npm run data:project-board-owner-snapshot"));
});

test("web re-pin refuses a file that is not an owner export", () => {
  const exportPath = path.join(tmp("exp2"), "export.json");
  fs.writeFileSync(exportPath, "{}\n");
  assert.throws(() => repinWeb({ webDir: tmp("web2"), exportPath, write: true }), /not an owner export/);
});
