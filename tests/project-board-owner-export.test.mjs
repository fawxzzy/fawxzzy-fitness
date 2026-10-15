import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { buildProjectBoardOwnerExport, renderProjectBoardOwnerExport, runProjectBoardOwnerExport } from "../scripts/export-project-board-owner.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const readSources = () => ({
  registry: fs.readFileSync(path.join(repoRoot, "config/fitness-owner-work-registry.json"), "utf8"),
  roadmap: fs.readFileSync(path.join(repoRoot, "scripts/feedback-monetization-roadmap.mjs"), "utf8"),
  session: fs.readFileSync(path.join(repoRoot, "scripts/feedback-session-exercise-timer-cards.mjs"), "utf8"),
  adapter: fs.readFileSync(path.join(repoRoot, "scripts/export-project-board-owner.mjs"), "utf8"),
});
const bytes = readSources();
const registry = JSON.parse(bytes.registry);
const acceptedSnapshot = JSON.parse(fs.readFileSync(path.join(repoRoot, "exports/fitness.project-board.owner-export.v1.json"), "utf8"));

const syntheticCard = (cardId = "FF-TEST-001") => ({
  cardId, title: "Synthetic owner card", description: "Synthetic fixture only, never a live card.",
  priority: "P2", dependsOn: ["FF-CORE-001"],
  acceptanceCriteria: ["Stable identity is retained.", "Visibility is reviewed explicitly.", "No live mutation is performed."],
});

async function fixture(t, definitions = []) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fitness-owner-export-"));
  t.after(() => {
    const relative = path.relative(os.tmpdir(), temp);
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    fs.rmSync(temp, { recursive: true, force: true });
  });
  for (const relative of ["config/fitness-owner-work-registry.json", "scripts/feedback-monetization-roadmap.mjs", "scripts/feedback-session-exercise-timer-cards.mjs", "scripts/export-project-board-owner.mjs"]) {
    fs.mkdirSync(path.dirname(path.join(temp, relative)), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, relative), path.join(temp, relative));
  }
  for (const definition of definitions) {
    fs.appendFileSync(path.join(temp, "scripts/feedback-monetization-roadmap.mjs"), `\nFEEDBACK_MONETIZATION_ROADMAP.push(${JSON.stringify(definition)});\n`);
  }
  const module = await import(pathToFileURL(path.join(temp, "scripts/export-project-board-owner.mjs")).href);
  const changed = structuredClone(registry);
  const fixtureBytes = {
    ...bytes,
    roadmap: fs.readFileSync(path.join(temp, "scripts/feedback-monetization-roadmap.mjs"), "utf8"),
  };
  const build = () => module.buildProjectBoardOwnerExport(changed, { ...fixtureBytes, registry: JSON.stringify(changed) });
  const add = (id, visibility, status = "planning") => changed.workItems.push({ id, status, updatedAt: changed.updatedAt, ...(visibility === undefined ? {} : { visibility }) });
  return { temp, module, changed, build, add };
}

test("exports the exact stable active and planned Fitness owner set", () => {
  const output = buildProjectBoardOwnerExport(registry, bytes);
  assert.equal(output.contract_version, "atlas.project-board.owner-export.v1");
  assert.equal(output.project_id, "fitness");
  assert.equal(output.extensions.source_work_item_count, 39);
  assert.equal(output.cards.length, 24);
  assert.deepEqual(output.cards.map((card) => card.record.card_id), [...output.cards.map((card) => card.record.card_id)].sort());
  assert.equal(new Set(output.cards.map((card) => card.record.card_id)).size, 24);
  assert.ok(output.cards.some((card) => card.record.card_id === "FF-GAM-002"));
  assert.ok(output.cards.some((card) => card.record.card_id === "FF-ROUTINE-001"));
  assert.deepEqual(output.cards, acceptedSnapshot.cards);
});

test("keeps completed owner truth out of the live export", () => {
  const output = buildProjectBoardOwnerExport(registry, bytes);
  const completed = registry.workItems.filter((item) => item.status === "fixed");
  assert.equal(completed.length, 15);
  for (const item of completed) assert.equal(output.cards.some((card) => card.record.card_id === item.id), false);
});

test("maps owner snapshot and latest accepted journal states without inventing readiness", () => {
  const output = buildProjectBoardOwnerExport(registry, bytes);
  for (const card of output.cards) {
    const ownerState = card.record.extensions.owner_status;
    if (ownerState === "fawxzzy_review" || ownerState === "review") {
      assert.equal(card.record_status, "active");
      assert.equal(card.record.lifecycle, "review");
    } else if (ownerState === "confirmed" || ownerState === "planning") {
      assert.equal(card.record_status, "candidate");
      assert.equal(card.record.lifecycle, "planning");
    } else {
      assert.equal(ownerState, "in_progress");
      assert.equal(card.record_status, "active");
      assert.equal(card.record.lifecycle, "in-progress");
    }
  }
});

test("applies the latest accepted non-security journal lifecycle and timestamp", () => {
  const output = buildProjectBoardOwnerExport(registry, bytes);
  const expected = new Map([
    ["FF-ANALYTICS-002", ["planning", "2026-07-15T00:49:00.000Z"]],
    ["FF-GAM-001", ["in-progress", "2026-07-15T15:10:00.000Z"]],
    ["FF-GAM-002", ["planning", "2026-07-15T15:20:00.000Z"]],
    ["FF-RET-004", ["in-progress", "2026-07-15T14:30:00.000Z"]],
    ["FF-ROUTINE-001", ["review", "2026-07-15T18:00:00.000Z"]],
    ["FF-SESSION-001", ["review", "2026-07-15T20:22:00.000Z"]],
  ]);
  for (const [cardId, [lifecycle, updatedAt]] of expected) {
    const card = output.cards.find((entry) => entry.record.card_id === cardId);
    assert.equal(card.record.lifecycle, lifecycle, cardId);
    assert.equal(card.record.updated_at, updatedAt, cardId);
  }
});

test("public cards contain stable product facts and no private/provider fields", () => {
  const output = buildProjectBoardOwnerExport(registry, bytes);
  const forbiddenKeys = /(discord|channel|thread|message|provider|service_role|secret|token|proof|reporter|user_id|workout_data|auth_data)/i;
  const visit = (value, pathName = "export") => {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${pathName}[${index}]`));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.test(key), false, `forbidden key ${pathName}.${key}`);
      visit(child, `${pathName}.${key}`);
    }
  };
  visit(output.cards);
  for (const card of output.cards) {
    assert.match(card.record.card_id, /^FF-[A-Z]+-[0-9]{3}$/);
    assert.match(card.idempotency_key, /^pbk_fitness_ff-[a-z0-9-]+_v1$/);
    assert.equal(card.record.project_id, "fitness");
    assert.ok(card.content.acceptance_criteria.length >= 3);
    assert.ok(card.content.evidence.every((entry) => entry.startsWith("repos/fawxzzy-fitness/")));
  }
});

test("reconciles the owner and research denominators without importing research candidates", () => {
  const output = buildProjectBoardOwnerExport(registry, bytes);
  assert.equal(output.extensions.selected_owner_snapshot_record_count, 55);
  assert.equal(output.extensions.excluded_unstable_or_nonfitness_record_count, 18);
  assert.equal(output.extensions.research_candidate_count, 64);
  assert.equal(output.extensions.research_candidate_exported_count, 0);
  assert.equal(output.extensions.research_stable_id_overlap_count, 0);
  assert.equal(output.extensions.deferred_board_journal_event_count, 38);
  assert.equal(output.extensions.deferred_board_journal_public_stable_additions, 2);
  assert.equal(output.extensions.deferred_board_journal_security_incident_exclusions, 1);
  assert.equal(output.extensions.deferred_board_journal_selection, "root schemaVersion equals atlas.board-card-journal.v1");
  assert.equal(output.extensions.deferred_board_journal_digest_algorithm, "sha256 of ordinal filename|lowercase-file-sha256 lines joined with LF and no terminal LF");
  assert.equal(output.extensions.deferred_board_journal_sha256, "182178ae89a240bfaabb4c57bc406b38fc7b2ec4edb58a34b6e11dd5b92f9fca");
  assert.equal(output.extensions.private_records_included, false);
  assert.equal(output.extensions.external_system_identifiers_included, false);
});

test("render is deterministic and synthetic write/check readback is current", async (t) => {
  assert.equal(renderProjectBoardOwnerExport(repoRoot), renderProjectBoardOwnerExport(repoRoot));
  const f = await fixture(t);
  f.module.runProjectBoardOwnerExport([], f.temp);
  f.module.runProjectBoardOwnerExport(["--check"], f.temp);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.temp, "exports/fitness.project-board.owner-export.v1.json"), "utf8")).cards, acceptedSnapshot.cards);
});

test("fails closed on unstable identities, duplicates, and stale output", () => {
  const duplicate = structuredClone(registry);
  duplicate.workItems[1].id = duplicate.workItems[0].id;
  assert.throws(() => buildProjectBoardOwnerExport(duplicate, { ...bytes, registry: JSON.stringify(duplicate) }), /unique stable FF ids/);
  const missing = structuredClone(registry);
  missing.workItems.pop();
  assert.throws(() => buildProjectBoardOwnerExport(missing, { ...bytes, registry: JSON.stringify(missing) }), /missing baseline card/);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fitness-owner-export-"));
  fs.mkdirSync(path.join(temp, "config"), { recursive: true });
  fs.mkdirSync(path.join(temp, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(temp, "exports"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "config/fitness-owner-work-registry.json"), path.join(temp, "config/fitness-owner-work-registry.json"));
  fs.copyFileSync(path.join(repoRoot, "scripts/feedback-monetization-roadmap.mjs"), path.join(temp, "scripts/feedback-monetization-roadmap.mjs"));
  fs.copyFileSync(path.join(repoRoot, "scripts/feedback-session-exercise-timer-cards.mjs"), path.join(temp, "scripts/feedback-session-exercise-timer-cards.mjs"));
  fs.copyFileSync(path.join(repoRoot, "scripts/export-project-board-owner.mjs"), path.join(temp, "scripts/export-project-board-owner.mjs"));
  fs.writeFileSync(path.join(temp, "exports/fitness.project-board.owner-export.v1.json"), "{}\n");
  assert.throws(() => runProjectBoardOwnerExport(["--check"], temp), /stale/);
  fs.rmSync(temp, { recursive: true, force: true });
});

test("supports bounded source-backed growth without changing the accepted snapshot", async (t) => {
  const f = await fixture(t, [syntheticCard(), syntheticCard("FF-TEST-002")]);
  f.add("FF-TEST-001", "private");
  f.add("FF-TEST-002", "public");
  const output = f.build();
  assert.equal(output.extensions.source_work_item_count, 41);
  assert.equal(output.extensions.exported_card_count, 26);
  assert.equal(output.extensions.excluded_completed_card_count, 15);
  assert.deepEqual(output.cards.filter((card) => !card.record.card_id.startsWith("FF-TEST-")), acceptedSnapshot.cards);
  const added = output.cards.find((card) => card.record.card_id === "FF-TEST-002");
  assert.equal(added.record.extensions.public_safe, true);
  assert.equal(added.record.extensions.visibility, "public");
  assert.equal(added.idempotency_key, "pbk_fitness_ff-test-002_v1");
  assert.deepEqual(output, f.build());
  fs.writeFileSync(path.join(f.temp, "config/fitness-owner-work-registry.json"), JSON.stringify(f.changed));
  f.module.runProjectBoardOwnerExport([], f.temp);
  f.module.runProjectBoardOwnerExport(["--check"], f.temp);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.temp, "exports/fitness.project-board.owner-export.v1.json"), "utf8")), output);
});

test("requires an explicit valid visibility decision for every new card", async (t) => {
  const f = await fixture(t, [syntheticCard()]);
  f.add("FF-TEST-001");
  assert.throws(f.build, /explicit visibility/);
  for (const visibility of [null, true, "PUBLIC", "", "internal"]) {
    f.changed.workItems.at(-1).visibility = visibility;
    assert.throws(f.build, /visibility/);
  }
});

test("marks private and unknown cards non-public without claiming a sanitized export", async (t) => {
  const f = await fixture(t, [syntheticCard()]);
  f.add("FF-TEST-001", "unknown");
  for (const visibility of ["unknown", "private"]) {
    f.changed.workItems.at(-1).visibility = visibility;
    const output = f.build();
    const card = output.cards.find((entry) => entry.record.card_id === "FF-TEST-001");
    assert.equal(card.record.extensions.public_safe, false);
    assert.equal(card.record.extensions.visibility, visibility);
    assert.equal(output.extensions.private_records_included, true);
    assert.equal(output.extensions.external_system_identifiers_included, false);
  }
});

test("does not inherit public visibility for a previously excluded baseline card", () => {
  const changed = structuredClone(registry);
  const item = changed.workItems.find((entry) => entry.status === "fixed");
  item.status = "planning";
  const output = buildProjectBoardOwnerExport(changed, { ...bytes, registry: JSON.stringify(changed) });
  assert.equal(output.cards.find((card) => card.record.card_id === item.id).record.extensions.public_safe, false);
});

test("honors an explicit private decision on an accepted identity in a synthetic clone", () => {
  const changed = structuredClone(registry);
  const item = changed.workItems.find((entry) => entry.id === acceptedSnapshot.cards[0].record.card_id);
  item.visibility = "private";
  const output = buildProjectBoardOwnerExport(changed, { ...bytes, registry: JSON.stringify(changed) });
  assert.equal(output.cards.find((card) => card.record.card_id === item.id).record.extensions.public_safe, false);
  assert.equal(output.extensions.private_records_included, true);
});

test("derives completed exclusions when a synthetic new card is already fixed", async (t) => {
  const f = await fixture(t, [syntheticCard()]);
  f.add("FF-TEST-001", "private", "fixed");
  const output = f.build();
  assert.equal(output.extensions.source_work_item_count, 40);
  assert.equal(output.extensions.excluded_completed_card_count, 16);
  assert.deepEqual(output.cards, acceptedSnapshot.cards);
});

test("validates fixed-card source data before excluding it from the export", async (t) => {
  for (const definition of [
    { cardId: "FF-TEST-999" },
    { ...syntheticCard("FF-TEST-999"), title: "" },
    { ...syntheticCard("FF-TEST-999"), description: "" },
    { ...syntheticCard("FF-TEST-999"), acceptanceCriteria: ["Only one."] },
    { ...syntheticCard("FF-TEST-999"), dependsOn: ["FF-ABSENT-001"] },
  ]) {
    const f = await fixture(t, [definition]);
    f.add("FF-TEST-999", "private", "fixed");
    assert.throws(f.build, /title|description|acceptance criteria|invalid dependencies/);
  }
});

test("requires a matching source definition and preserves baseline identities", async (t) => {
  const f = await fixture(t);
  f.add("FF-TEST-001", "private");
  assert.throws(f.build, /missing scoped source card/);
  f.changed.workItems = f.changed.workItems.filter((item) => item.id !== "FF-CORE-001");
  assert.throws(f.build, /missing baseline card/);
});

test("rejects duplicate source definitions, duplicate registry IDs and invalid card data", async (t) => {
  const duplicateSource = await fixture(t, [syntheticCard("FF-CORE-001")]);
  assert.throws(duplicateSource.build, /duplicate source card/);
  const f = await fixture(t, [syntheticCard()]);
  f.add("FF-TEST-001", "private");
  f.add("FF-TEST-001", "private");
  assert.throws(f.build, /unique stable FF ids/);
  f.changed.workItems.pop();
  f.changed.workItems.at(-1).id = "FF-test-001";
  assert.throws(f.build, /unique stable FF ids/);
  f.changed.workItems.at(-1).id = "FF-TEST-001";
  f.changed.workItems.at(-1).status = "deleted";
  assert.throws(f.build, /unsupported live status/);
  f.changed.workItems.at(-1).status = "planning";
  f.changed.workItems.at(-1).updatedAt = "invalid";
  assert.throws(f.build, /timestamp/);
  f.changed.workItems.at(-1).updatedAt = f.changed.updatedAt;
  f.changed.workItems.push(null);
  assert.throws(f.build, /registry items must be objects/);
});

test("retains validation for acceptance criteria, dependencies and reconciliation provenance", async (t) => {
  const badCriteria = await fixture(t, [{ ...syntheticCard(), acceptanceCriteria: ["Only one."] }]);
  badCriteria.add("FF-TEST-001", "private");
  assert.throws(badCriteria.build, /at least three acceptance criteria/);
  const badDependency = await fixture(t, [{ ...syntheticCard(), dependsOn: ["FF-ABSENT-001"] }]);
  badDependency.add("FF-TEST-001", "private");
  assert.throws(badDependency.build, /invalid dependencies/);
  const f = await fixture(t, [syntheticCard()]);
  f.add("FF-TEST-001", "private");
  f.changed.provenance.researchCandidateImport.adoptedCount = 1;
  assert.throws(f.build, /reconciliation denominator/);
});

test("binds new-card provenance to its actual collection rather than its ID prefix", async (t) => {
  const f = await fixture(t, [syntheticCard("FF-SESSION-999")]);
  f.add("FF-SESSION-999", "private");
  const card = f.build().cards.find((entry) => entry.record.card_id === "FF-SESSION-999");
  assert.equal(card.record.source_ref, "repos/fawxzzy-fitness/scripts/feedback-monetization-roadmap.mjs#FF-SESSION-999");
});
