#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FEEDBACK_MONETIZATION_ROADMAP } from "./feedback-monetization-roadmap.mjs";
import { FEEDBACK_SESSION_TIMER_CARDS } from "./feedback-session-exercise-timer-cards.mjs";

const REGISTRY_PATH = "config/fitness-owner-work-registry.json";
const ROADMAP_PATH = "scripts/feedback-monetization-roadmap.mjs";
const SESSION_PATH = "scripts/feedback-session-exercise-timer-cards.mjs";
const ADAPTER_PATH = "scripts/export-project-board-owner.mjs";
const DEFAULT_OUTPUT_PATH = "exports/fitness.project-board.owner-export.v1.json";
const BOARD_ID = "fitness:project-feedback:fitness-active";
const ATLAS_PREFIX = "repos/fawxzzy-fitness/";
const STABLE_CARD_ID = /^FF-[A-Z]+-[0-9]{3}$/;
// Retained reconciliation identities, not an upper bound on adopted work.
const BASELINE_CARD_IDS = new Set([
  "FF-ACCOUNT-001", "FF-ANALYTICS-001", "FF-ANALYTICS-002", "FF-BETA-001", "FF-COPILOT-001",
  "FF-CORE-001", "FF-CORE-002", "FF-ENGINE-001", "FF-ENGINE-002", "FF-GAM-001", "FF-GAM-002",
  "FF-HISTORY-001", "FF-LEGAL-001", "FF-MKT-001", "FF-MON-001", "FF-MON-002", "FF-MON-003",
  "FF-ONBOARD-001", "FF-PROG-001", "FF-PWA-001", "FF-PWA-002", "FF-PWA-003", "FF-QA-001",
  "FF-QA-002", "FF-RECAP-001", "FF-RET-001", "FF-RET-002", "FF-RET-003", "FF-RET-004",
  "FF-ROUTINE-001", "FF-SEC-001", "FF-SESSION-001", "FF-SESSION-002", "FF-SESSION-003",
  "FF-SESSION-004", "FF-SESSION-005", "FF-SOC-001", "FF-SOC-002", "FF-TEMPLATES-001",
]);
// The accepted 24-card snapshot retains its existing public-safe decision; board-safe cards join once accepted.
const ACCEPTED_PUBLIC_CARD_IDS = new Set([
  "FF-ANALYTICS-001", "FF-ANALYTICS-002", "FF-BETA-001", "FF-ENGINE-001", "FF-ENGINE-002",
  "FF-GAM-001", "FF-GAM-002", "FF-MKT-001", "FF-ONBOARD-001", "FF-PWA-003", "FF-QA-002",
  "FF-RECAP-001", "FF-RET-001", "FF-RET-002", "FF-RET-003", "FF-RET-004", "FF-ROUTINE-001",
  "FF-SESSION-001", "FF-SESSION-002", "FF-SESSION-003", "FF-SESSION-004", "FF-SESSION-005",
  "FF-SOC-001", "FF-SOC-002",
  // Board-safe cards the owner has fixed and accepted from live verification (2026-11-09).
  "FF-ACCOUNT-002", "FF-AUTH-001", "FF-QA-003", "FF-RELIABILITY-001", "FF-RET-005",
]);
const VISIBILITIES = new Set(["public", "private", "unknown"]);
const STATUS_MAPPING = new Map([
  ["fawxzzy_review", { recordStatus: "active", lifecycle: "review" }],
  ["confirmed", { recordStatus: "candidate", lifecycle: "planning" }],
  ["planning", { recordStatus: "candidate", lifecycle: "planning" }],
  ["in_progress", { recordStatus: "active", lifecycle: "in-progress" }],
  ["review", { recordStatus: "active", lifecycle: "review" }],
]);
// Owner-completed (`fixed`) cards export as lifecycle `completed` ONLY when the id is in
// ACCEPTED_PUBLIC_CARD_IDS and its resolved visibility is `public`. Every other `fixed` card stays
// excluded, so completed private/monetization/security work never becomes public by accident.
// record_status "active" mirrors the only closed-type values this exporter has emitted (active, candidate).
const COMPLETED_MAPPING = { recordStatus: "active", lifecycle: "completed" };
const isExportedCompleted = (item) => item.status === "fixed" && ACCEPTED_PUBLIC_CARD_IDS.has(item.id) && visibilityFor(item) === "public";

const SUPPLEMENTAL_CARDS = [
  {
    cardId: "FF-GAM-002",
    title: "Expand Achievements and Earned Notifications",
    priority: "P2",
    dependsOn: ["FF-GAM-001"],
    description: "Plan a richer deterministic achievements phase and once-only earned notifications after the current achievement review is accepted.",
    acceptanceCriteria: ["Milestone unlock rules remain deterministic and safe.", "Notifications are deduplicated and consent-aware.", "No public achievement feed or social-pressure loop is introduced."],
  },
  {
    cardId: "FF-COPILOT-001",
    title: "Session Copilot / Progression Bot Interface",
    priority: "P1",
    dependsOn: ["FF-CORE-001", "FF-HISTORY-001", "FF-TEMPLATES-001"],
    description: "Complete the deterministic session-copilot action and recap contract while keeping the progression engine authoritative.",
    acceptanceCriteria: ["Actions remain deterministic and inspectable.", "Recap truth persists into history.", "The interface does not become an opaque chat-first coach."],
  },
  {
    cardId: "FF-ROUTINE-001",
    title: "Add Optional Planned Workout Days",
    priority: "P2",
    dependsOn: [],
    description: "Distinguish optional workout days from required and rest days without weakening adherence, missed-day, or streak truth.",
    acceptanceCriteria: ["Routine setup distinguishes required, optional, and rest days.", "Skipped optional days do not count as missed required sessions.", "Completed optional workouts contribute normal session and progression truth."],
  },
  {
    cardId: "FF-HISTORY-001",
    title: "Rebuild useful history metrics and progression analytics",
    priority: null,
    dependsOn: [],
    description: "Keep History focused on understandable, action-guiding training outcomes rather than filler statistics.",
    acceptanceCriteria: ["History surfaces useful progression outcomes.", "Secondary diagnostics remain deeper in the flow.", "Low-data states remain clear and truthful."],
  },
  {
    cardId: "FF-PWA-002",
    title: "Offline-Ready PWA + Persistent Session Restore",
    priority: "P1",
    dependsOn: ["FF-PWA-001"],
    description: "Provide a resilient installed-app experience with bounded offline behavior and deterministic session restoration.",
    acceptanceCriteria: ["Installed sessions restore deterministically.", "Offline edits fail closed or synchronize predictably.", "Conflict and recovery states are explicit."],
  },
  {
    cardId: "FF-QA-002",
    title: "Harden Atlas Contracts and CI Environment Verification",
    priority: "P1",
    dependsOn: [],
    description: "Keep Fitness contract exports and environment verification deterministic across local and hosted CI.",
    acceptanceCriteria: ["Environment classification is deterministic.", "Contract export and check commands produce stable results.", "Hosted checks remain linked to their exact source identity."],
  },
  {
    cardId: "FF-SOC-002",
    title: "Show Live Active User Presence on Today",
    priority: "P2",
    dependsOn: ["FF-ANALYTICS-001", "FF-SOC-001"],
    description: "Show a privacy-preserving aggregate active-user count on Today without exposing individual identities.",
    acceptanceCriteria: ["Presence counting rules are deterministic.", "Only aggregate presence is exposed.", "Unavailable and stale states never present false precision."],
  },
  {
    cardId: "FF-TEMPLATES-001",
    title: "Add per-day exercise templates for easy copy, paste, and modification",
    priority: null,
    dependsOn: [],
    description: "Provide reusable day-level exercise templates without expanding into broad routine sharing.",
    acceptanceCriteria: ["Day templates are reusable and editable.", "The workflow is clear on mobile.", "Routine sharing remains outside this card."],
  },
  {
    cardId: "FF-RELIABILITY-001",
    title: "Make Workout Start Atomic",
    priority: "P1",
    dependsOn: [],
    description: "Make starting a workout an all-or-nothing step so an interrupted start never leaves a partial session behind.",
    acceptanceCriteria: ["Starting a workout either fully succeeds or leaves no partial session.", "Retried or double-tapped starts do not create duplicate sessions.", "The change goes live only after the matching database update is reviewed and applied."],
  },
  {
    cardId: "FF-ACCOUNT-002",
    title: "Enable Account Portal to Fitness Handoff",
    priority: "P1",
    dependsOn: [],
    description: "Let people who begin in the Fawxzzy account portal continue straight into Fitness without a second sign-in step.",
    acceptanceCriteria: ["Opening Fitness from the account portal lands the signed-in user in the app.", "When the handoff is unavailable the user sees a clear sign-in path instead of a dead end.", "The handoff stays off until readiness checks pass."],
  },
  {
    cardId: "FF-ACCOUNT-003",
    title: "Complete Self-Service Account Tools",
    priority: "P2",
    dependsOn: [],
    description: "Finish the self-service account lifecycle: recovering a forgotten sign-in, downloading your own data, and removing your account.",
    acceptanceCriteria: ["Forgotten-sign-in recovery is verified end to end.", "People can export their own data.", "People can request account removal with a clear confirmation step."],
  },
  {
    cardId: "FF-AUTH-001",
    title: "Make Sign-In Outcomes Clear",
    priority: "P1",
    dependsOn: [],
    description: "Show a clear message whenever a sign-in attempt does not complete, instead of quietly returning to the sign-in form.",
    acceptanceCriteria: ["Every sign-in attempt that does not complete explains the next step.", "Temporary delays tell the user how to retry.", "Successful sign-in behavior is unchanged."],
  },
  {
    cardId: "FF-ACCOUNT-004",
    title: "Finish Account Site Setup for the Fitness App",
    priority: "P1",
    dependsOn: ["FF-AUTH-001"],
    description: "Complete the shared account site that Fitness relies on for sign-in, sign-out, forgotten-sign-in recovery and returning people to the app, so the account side is finished before more Fitness work builds on it.",
    acceptanceCriteria: ["Sign-up, sign-in, sign-out and forgotten-sign-in recovery all work from the account site and return people to the Fitness app.", "The account site and the app always agree on who is signed in.", "Every account screen Fitness links to is complete and checked in the installed phone app."],
  },

  {
    cardId: "FF-RET-005",
    title: "Respect the Local Day Boundary in Workout Streaks",
    priority: "P1",
    dependsOn: ["FF-RET-002"],
    description: "Count streak days in the user's local time zone so an evening workout is credited to the day it was logged.",
    acceptanceCriteria: ["A workout logged in the evening counts toward that local calendar day.", "Streak, best-streak, and calendar views agree on day boundaries.", "Users without a saved time zone keep a clear, documented default."],
  },
  {
    cardId: "FF-QA-003",
    title: "Return a Proper Not-Found Status for Missing Pages",
    priority: "P2",
    dependsOn: [],
    description: "Pages for items that do not exist or are unavailable should respond with a real not-found status along with the friendly not-found screen.",
    acceptanceCriteria: ["Missing or unavailable pages respond with a not-found status, not a success status.", "The friendly not-found screen still renders.", "Existing pages are unaffected."],
  },
];

const normalize = (value) => String(value).replace(/\r\n?/g, "\n");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
const uniqueSorted = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right));
const atlasPath = (value) => `${ATLAS_PREFIX}${value.replaceAll("\\", "/")}`;

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function normalizeTimestamp(value) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("invalid registry timestamp");
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error("invalid registry timestamp");
  return parsed.toISOString();
}

function sourceCards() {
  const byId = new Map();
  for (const [cards, sourcePath] of [[FEEDBACK_MONETIZATION_ROADMAP, ROADMAP_PATH], [FEEDBACK_SESSION_TIMER_CARDS, SESSION_PATH], [SUPPLEMENTAL_CARDS, ADAPTER_PATH]]) {
    for (const card of cards) {
      const id = requireString(card.cardId, "cardId");
      if (!STABLE_CARD_ID.test(id)) throw new Error(`invalid source card ${id}`);
      if (byId.has(id)) throw new Error(`duplicate source card ${id}`);
      // Keep legacy supplemental refs stable; new cards use the defining file.
      byId.set(id, { card, sourcePath: sourcePath === ADAPTER_PATH && BASELINE_CARD_IDS.has(id) ? REGISTRY_PATH : sourcePath });
    }
  }
  return byId;
}

function visibilityFor(item) {
  if (item.visibility === undefined) {
    if (!BASELINE_CARD_IDS.has(item.id)) throw new Error(`${item.id} requires explicit visibility: public, private or unknown`);
    return ACCEPTED_PUBLIC_CARD_IDS.has(item.id) ? "public" : "unknown";
  }
  if (!VISIBILITIES.has(item.visibility)) throw new Error(`invalid visibility for ${item.id}`);
  return item.visibility;
}

function validateSourceCard(item, source, validIds) {
  const priority = source.priority ?? null;
  const priorityMapping = new Map([["P0", "critical"], ["P1", "high"], ["P2", "medium"], ["P3", "low"]]);
  if (priority !== null && !priorityMapping.has(priority)) throw new Error(`invalid priority for ${item.id}`);
  const dependencyInput = source.dependsOn ?? [];
  if (!Array.isArray(dependencyInput) || dependencyInput.some((id) => typeof id !== "string" || !STABLE_CARD_ID.test(id) || !validIds.has(id) || id === item.id)) throw new Error(`invalid dependencies for ${item.id}`);
  const dependencies = uniqueSorted(dependencyInput);
  const criteria = source.acceptanceCriteria ?? [];
  if (!Array.isArray(criteria) || criteria.length < 3) throw new Error(`${item.id} requires at least three acceptance criteria`);
  return {
    title: requireString(source.title, `${item.id}.title`),
    description: requireString(source.description, `${item.id}.description`),
    priority: priority === null ? null : priorityMapping.get(priority),
    dependencies,
    criteria: criteria.map((criterion) => requireString(criterion, `${item.id}.acceptanceCriteria`)),
  };
}

function validateDependencyGraph(sources) {
  const remaining = new Map();
  const dependents = new Map([...sources.keys()].map((id) => [id, []]));
  for (const [id, source] of sources) {
    remaining.set(id, source.dependencies.length);
    for (const dependency of source.dependencies) dependents.get(dependency).push(id);
  }
  const ready = [...remaining.keys()].filter((id) => remaining.get(id) === 0);
  for (let index = 0; index < ready.length; index += 1) {
    for (const id of dependents.get(ready[index])) {
      remaining.set(id, remaining.get(id) - 1);
      if (remaining.get(id) === 0) ready.push(id);
    }
  }
  if (ready.length !== sources.size) throw new Error("Fitness source dependency cycle");
}

function mapCard(item, source, sourcePath) {
  const mapping = item.status === "fixed" ? COMPLETED_MAPPING : STATUS_MAPPING.get(item.status);
  if (!mapping) throw new Error(`unsupported live status for ${item.id}: ${item.status}`);
  const visibility = visibilityFor(item);
  const sourceRef = `${atlasPath(sourcePath)}#${item.id}`;
  const normalizedId = item.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    idempotency_key: `pbk_fitness_${normalizedId}_v1`,
    record_kind: "project-work",
    record_status: mapping.recordStatus,
    record: {
      contract_version: "atlas.card-record.v2",
      card_id: item.id,
      project_id: "fitness",
      board_id: BOARD_ID,
      title: source.title,
      description: source.description,
      card_type: "feature",
      lifecycle: mapping.lifecycle,
      priority: source.priority,
      owner: "fitness",
      dependencies: source.dependencies,
      board_version: 1,
      updated_at: normalizeTimestamp(item.updatedAt),
      source_ref: sourceRef,
      extensions: { owner_status: item.status, public_safe: visibility === "public", ...(item.visibility === undefined ? {} : { visibility }) },
    },
    source: { source_id: "fitness-owner-work-registry", source_ref: sourceRef, source_status: "current", source_updated_at: normalizeTimestamp(item.updatedAt) },
    content: {
      summary: source.description,
      objective: source.description,
      acceptance_criteria: source.criteria,
      discoveries: [], next_actions: [], blockers: [], evidence: [atlasPath(sourcePath)],
    },
    relationships: { parent_card_id: null, duplicate_of: null, superseded_by: null },
  };
}

export function buildProjectBoardOwnerExport(registry, sourceBytes) {
  if (registry?.schemaVersion !== 1 || registry.projectId !== "fitness" || registry.state !== "active") throw new Error("unexpected Fitness registry identity");
  if (!Array.isArray(registry.workItems)) throw new Error("Fitness workItems must be an array");
  if (registry.workItems.some((item) => !item || typeof item !== "object" || Array.isArray(item))) throw new Error("Fitness registry items must be objects");
  const ids = registry.workItems.map((item) => item.id);
  const validIds = new Set(ids);
  if (validIds.size !== ids.length || ids.some((id) => typeof id !== "string" || !STABLE_CARD_ID.test(id))) throw new Error("Fitness registry ids must be unique stable FF ids");
  for (const id of BASELINE_CARD_IDS) if (!validIds.has(id)) throw new Error(`missing baseline card ${id}`);
  const provenance = registry.provenance;
  if (provenance?.selectedOwnerSnapshot?.recordCount !== 55 || provenance.selectedOwnerSnapshot.stableCardCount !== 37
    || provenance.deferredBoardJournal?.eventCount !== 38 || provenance.deferredBoardJournal.publicStableAdditions !== 2
    || provenance.deferredBoardJournal.securityIncidentExclusions !== 1
    || provenance.deferredBoardJournal.selection !== "root schemaVersion equals atlas.board-card-journal.v1"
    || provenance.deferredBoardJournal.digestAlgorithm !== "sha256 of ordinal filename|lowercase-file-sha256 lines joined with LF and no terminal LF"
    || provenance.deferredBoardJournal.sha256 !== "182178ae89a240bfaabb4c57bc406b38fc7b2ec4edb58a34b6e11dd5b92f9fca"
    || provenance.researchCandidateImport?.recordCount !== 64 || provenance.researchCandidateImport.adoptedCount !== 0
    || provenance.researchCandidateImport.stableIdOverlapCount !== 0 || provenance.excludedOwnerRecords?.recordCount !== 18) {
    throw new Error("Fitness reconciliation denominator is incomplete");
  }
  const sources = sourceCards();
  const validatedSources = new Map();
  for (const item of registry.workItems) {
    if (!sources.has(item.id)) throw new Error(`missing scoped source card ${item.id}`);
    if (item.status !== "fixed" && !STATUS_MAPPING.has(item.status)) throw new Error(`unsupported live status for ${item.id}: ${item.status}`);
    normalizeTimestamp(item.updatedAt);
    visibilityFor(item);
    validatedSources.set(item.id, validateSourceCard(item, sources.get(item.id).card, validIds));
  }
  validateDependencyGraph(validatedSources);
  const combined = [sourceBytes.registry, sourceBytes.roadmap, sourceBytes.session, sourceBytes.adapter].map(normalize).join("\n--FITNESS-OWNER-SOURCE--\n");
  const sourceRevision = `sha256:${digest(combined)}`;
  const generatedAt = normalizeTimestamp(registry.updatedAt);
  const cards = registry.workItems.filter((item) => item.status !== "fixed" || isExportedCompleted(item)).map((item) => {
    const source = sources.get(item.id);
    return mapCard(item, validatedSources.get(item.id), source.sourcePath);
  })
    .sort((left, right) => left.record.card_id.localeCompare(right.record.card_id));
  return {
    contract_version: "atlas.project-board.owner-export.v1",
    export_id: `pbe_fitness_owner_registry_${sourceRevision.slice(7, 19)}`,
    project_id: "fitness", board_id: BOARD_ID, owner: "fitness", adapter_id: "fitness-owner-registry-v1",
    source_revision: sourceRevision, generated_at: generatedAt,
    sources: [
      { source_id: "fitness-owner-work-registry", kind: "json", repository: "fawxzzy-fitness", path: atlasPath(REGISTRY_PATH), revision: `sha256:${digest(normalize(sourceBytes.registry))}`, observed_at: generatedAt },
      { source_id: "fitness-feedback-monetization-roadmap", kind: "generated", repository: "fawxzzy-fitness", path: atlasPath(ROADMAP_PATH), revision: `sha256:${digest(normalize(sourceBytes.roadmap))}`, observed_at: generatedAt },
      { source_id: "fitness-session-timer-roadmap", kind: "generated", repository: "fawxzzy-fitness", path: atlasPath(SESSION_PATH), revision: `sha256:${digest(normalize(sourceBytes.session))}`, observed_at: generatedAt },
      { source_id: "fitness-owner-export-adapter", kind: "generated", repository: "fawxzzy-fitness", path: atlasPath(ADAPTER_PATH), revision: `sha256:${digest(normalize(sourceBytes.adapter))}`, observed_at: generatedAt },
    ],
    cards,
    extensions: {
      source_work_item_count: registry.workItems.length, exported_card_count: cards.length, exported_completed_card_count: cards.filter((card) => card.record.lifecycle === "completed").length, excluded_completed_card_count: registry.workItems.length - cards.length,
      selected_owner_snapshot_record_count: 55, excluded_unstable_or_nonfitness_record_count: 18,
      deferred_board_journal_event_count: 38, deferred_board_journal_public_stable_additions: 2,
      deferred_board_journal_security_incident_exclusions: 1,
      deferred_board_journal_selection: provenance.deferredBoardJournal.selection,
      deferred_board_journal_digest_algorithm: provenance.deferredBoardJournal.digestAlgorithm,
      deferred_board_journal_sha256: provenance.deferredBoardJournal.sha256,
      research_candidate_count: 64, research_candidate_exported_count: 0, research_stable_id_overlap_count: 0,
      research_disposition: "planning-only candidates require explicit owner adoption before export",
      private_records_included: cards.some((card) => !card.record.extensions.public_safe), external_system_identifiers_included: false,
    },
  };
}

export function renderProjectBoardOwnerExport(repoRoot) {
  const sourceBytes = {
    registry: fs.readFileSync(path.join(repoRoot, REGISTRY_PATH), "utf8"),
    roadmap: fs.readFileSync(path.join(repoRoot, ROADMAP_PATH), "utf8"),
    session: fs.readFileSync(path.join(repoRoot, SESSION_PATH), "utf8"),
    adapter: fs.readFileSync(path.join(repoRoot, ADAPTER_PATH), "utf8"),
  };
  return `${JSON.stringify(buildProjectBoardOwnerExport(JSON.parse(sourceBytes.registry), sourceBytes), null, 2)}\n`;
}

export function runProjectBoardOwnerExport(argv, repoRoot = process.cwd()) {
  const check = argv.includes("--check");
  const unknown = argv.filter((argument) => argument !== "--check");
  if (unknown.length) throw new Error(`unknown argument: ${unknown[0]}`);
  const rendered = renderProjectBoardOwnerExport(repoRoot);
  const outputPath = path.join(repoRoot, DEFAULT_OUTPUT_PATH);
  if (check) {
    if (!fs.existsSync(outputPath) || normalize(fs.readFileSync(outputPath, "utf8")) !== normalize(rendered)) throw new Error(`${DEFAULT_OUTPUT_PATH} is stale`);
    process.stdout.write(`fitness-project-board-owner-export: ok (${JSON.parse(rendered).cards.length} cards)\n`);
    return;
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rendered, "utf8");
  process.stdout.write(`fitness-project-board-owner-export: wrote ${DEFAULT_OUTPUT_PATH}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { runProjectBoardOwnerExport(process.argv.slice(2)); }
  catch (error) { console.error(`fitness-project-board-owner-export: ${error.message}`); process.exitCode = 1; }
}
