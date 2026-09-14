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
const STATUS_MAPPING = new Map([
  ["fawxzzy_review", { recordStatus: "active", lifecycle: "review" }],
  ["confirmed", { recordStatus: "candidate", lifecycle: "planning" }],
  ["planning", { recordStatus: "candidate", lifecycle: "planning" }],
  ["in_progress", { recordStatus: "active", lifecycle: "in-progress" }],
  ["review", { recordStatus: "active", lifecycle: "review" }],
]);

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
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error("invalid registry timestamp");
  return parsed.toISOString();
}

function sourceCards() {
  const cards = [...FEEDBACK_MONETIZATION_ROADMAP, ...FEEDBACK_SESSION_TIMER_CARDS, ...SUPPLEMENTAL_CARDS];
  const byId = new Map();
  for (const card of cards) {
    const id = requireString(card.cardId, "cardId");
    if (byId.has(id)) throw new Error(`duplicate source card ${id}`);
    byId.set(id, card);
  }
  return byId;
}

function mapCard(item, source, generatedAt) {
  const mapping = STATUS_MAPPING.get(item.status);
  if (!mapping) throw new Error(`unsupported live status for ${item.id}: ${item.status}`);
  const priority = source.priority ?? null;
  const priorityMapping = new Map([["P0", "critical"], ["P1", "high"], ["P2", "medium"], ["P3", "low"]]);
  if (priority !== null && !priorityMapping.has(priority)) throw new Error(`invalid priority for ${item.id}`);
  const dependencies = uniqueSorted(source.dependsOn ?? []);
  const criteria = source.acceptanceCriteria ?? [];
  if (!Array.isArray(criteria) || criteria.length < 3) throw new Error(`${item.id} requires at least three acceptance criteria`);
  const sourcePath = item.id.startsWith("FF-SESSION-") ? SESSION_PATH
    : FEEDBACK_MONETIZATION_ROADMAP.some((card) => card.cardId === item.id) ? ROADMAP_PATH
      : REGISTRY_PATH;
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
      title: requireString(source.title, `${item.id}.title`),
      description: requireString(source.description, `${item.id}.description`),
      card_type: "feature",
      lifecycle: mapping.lifecycle,
      priority: priority === null ? null : priorityMapping.get(priority),
      owner: "fitness",
      dependencies,
      board_version: 1,
      updated_at: normalizeTimestamp(item.updatedAt),
      source_ref: sourceRef,
      extensions: { owner_status: item.status, public_safe: true },
    },
    source: { source_id: "fitness-owner-work-registry", source_ref: sourceRef, source_status: "current", source_updated_at: normalizeTimestamp(item.updatedAt) },
    content: {
      summary: requireString(source.description, `${item.id}.description`),
      objective: requireString(source.description, `${item.id}.description`),
      acceptance_criteria: criteria.map((criterion) => requireString(criterion, `${item.id}.acceptanceCriteria`)),
      discoveries: [], next_actions: [], blockers: [], evidence: [atlasPath(sourcePath)],
    },
    relationships: { parent_card_id: null, duplicate_of: null, superseded_by: null },
  };
}

export function buildProjectBoardOwnerExport(registry, sourceBytes) {
  if (registry?.schemaVersion !== 1 || registry.projectId !== "fitness" || registry.state !== "active") throw new Error("unexpected Fitness registry identity");
  if (!Array.isArray(registry.workItems) || registry.workItems.length !== 39) throw new Error("Fitness owner truth must contain exactly 39 stable cards");
  const ids = registry.workItems.map((item) => item.id);
  if (new Set(ids).size !== ids.length || ids.some((id) => !/^FF-[A-Z]+-[0-9]{3}$/.test(id))) throw new Error("Fitness registry ids must be unique stable FF ids");
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
  for (const id of ids) if (!sources.has(id)) throw new Error(`missing public-safe source card ${id}`);
  const combined = [sourceBytes.registry, sourceBytes.roadmap, sourceBytes.session, sourceBytes.adapter].map(normalize).join("\n--FITNESS-OWNER-SOURCE--\n");
  const sourceRevision = `sha256:${digest(combined)}`;
  const generatedAt = normalizeTimestamp(registry.updatedAt);
  const cards = registry.workItems.filter((item) => item.status !== "fixed").map((item) => mapCard(item, sources.get(item.id), generatedAt))
    .sort((left, right) => left.record.card_id.localeCompare(right.record.card_id));
  if (cards.length !== 24) throw new Error("Fitness live owner export must contain exactly 24 active/planned cards");
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
      source_work_item_count: 39, exported_card_count: 24, excluded_completed_card_count: 15,
      selected_owner_snapshot_record_count: 55, excluded_unstable_or_nonfitness_record_count: 18,
      deferred_board_journal_event_count: 38, deferred_board_journal_public_stable_additions: 2,
      deferred_board_journal_security_incident_exclusions: 1,
      deferred_board_journal_selection: provenance.deferredBoardJournal.selection,
      deferred_board_journal_digest_algorithm: provenance.deferredBoardJournal.digestAlgorithm,
      deferred_board_journal_sha256: provenance.deferredBoardJournal.sha256,
      research_candidate_count: 64, research_candidate_exported_count: 0, research_stable_id_overlap_count: 0,
      research_disposition: "planning-only candidates require explicit owner adoption before export",
      private_records_included: false, external_system_identifiers_included: false,
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
