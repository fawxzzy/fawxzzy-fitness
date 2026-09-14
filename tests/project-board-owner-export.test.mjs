import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

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

test("render is deterministic and the checked export is current", () => {
  assert.equal(renderProjectBoardOwnerExport(repoRoot), renderProjectBoardOwnerExport(repoRoot));
  runProjectBoardOwnerExport(["--check"], repoRoot);
});

test("fails closed on unstable identities, duplicates, and stale output", () => {
  const duplicate = structuredClone(registry);
  duplicate.workItems[1].id = duplicate.workItems[0].id;
  assert.throws(() => buildProjectBoardOwnerExport(duplicate, { ...bytes, registry: JSON.stringify(duplicate) }), /unique stable FF ids/);
  const missing = structuredClone(registry);
  missing.workItems.pop();
  assert.throws(() => buildProjectBoardOwnerExport(missing, { ...bytes, registry: JSON.stringify(missing) }), /exactly 39/);
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
