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
const VISIBILITIES = new Set(["public", "private", "unknown"]);
const REQUIRED_OWNER_STATUSES = ["fawxzzy_review", "confirmed", "planning", "in_progress", "review", "fixed"];
const RECORD_STATUSES = new Set(["active", "candidate"]);
const LIFECYCLES = new Set(["planning", "in-progress", "review", "completed"]);
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

// Export policy now lives in the owner registry (acceptedPublicCardIds, statusMapping); the exporter only validates and applies it.
// Owner-completed (`fixed`) cards export as lifecycle `completed` ONLY when the id is in acceptedPublicCardIds and its
// resolved visibility is `public`. Every other `fixed` card stays excluded, so completed private/monetization/security
// work never becomes public by accident. The accepted 24-card snapshot keeps its public-safe decision; board-safe cards
// join once the owner has accepted them.
function loadPolicy(registry) {
  const ids = registry.acceptedPublicCardIds;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !STABLE_CARD_ID.test(id)) || new Set(ids).size !== ids.length) throw new Error("registry acceptedPublicCardIds must be unique stable FF ids");
  const mapping = registry.statusMapping;
  if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) throw new Error("registry statusMapping must be an object");
  const statusMapping = new Map();
  for (const status of REQUIRED_OWNER_STATUSES) {
    const entry = mapping[status];
    if (!entry || !RECORD_STATUSES.has(entry.recordStatus) || !LIFECYCLES.has(entry.lifecycle)) throw new Error(`registry statusMapping.${status} is invalid`);
    statusMapping.set(status, { recordStatus: entry.recordStatus, lifecycle: entry.lifecycle });
  }
  if (Object.keys(mapping).length !== REQUIRED_OWNER_STATUSES.length) throw new Error("registry statusMapping has unsupported statuses");
  return { accepted: new Set(ids), statusMapping };
}

// Cards authored in the registry carry their prose under `card`; a card's `sourcePath` keeps its legacy source_ref/evidence
// path (default: the registry itself).
function registryCards(registry) {
  return registry.workItems.filter((item) => item.card !== undefined).map((item) => {
    if (!item.card || typeof item.card !== "object" || Array.isArray(item.card)) throw new Error(`invalid registry card ${item.id}`);
    const { sourcePath = REGISTRY_PATH, ...fields } = item.card;
    return [{ cardId: item.id, ...fields }, requireString(sourcePath, `${item.id}.card.sourcePath`)];
  });
}

function sourceCards(registry) {
  const byId = new Map();
  const registrySources = registryCards(registry);
  for (const [cards, sourcePath] of [[FEEDBACK_MONETIZATION_ROADMAP, ROADMAP_PATH], [FEEDBACK_SESSION_TIMER_CARDS, SESSION_PATH]]) {
    for (const card of cards) {
      const id = requireString(card.cardId, "cardId");
      if (!STABLE_CARD_ID.test(id)) throw new Error(`invalid source card ${id}`);
      if (byId.has(id)) throw new Error(`duplicate source card ${id}`);
      byId.set(id, { card, sourcePath });
    }
  }
  for (const [card, sourcePath] of registrySources) {
    if (!STABLE_CARD_ID.test(card.cardId)) throw new Error(`invalid source card ${card.cardId}`);
    if (byId.has(card.cardId)) throw new Error(`duplicate source card ${card.cardId}`);
    byId.set(card.cardId, { card, sourcePath });
  }
  return byId;
}

function visibilityFor(item, policy) {
  if (item.visibility === undefined) {
    if (!BASELINE_CARD_IDS.has(item.id)) throw new Error(`${item.id} requires explicit visibility: public, private or unknown`);
    return policy.accepted.has(item.id) ? "public" : "unknown";
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

function mapCard(item, source, sourcePath, policy) {
  const mapping = policy.statusMapping.get(item.status);
  if (!mapping) throw new Error(`unsupported live status for ${item.id}: ${item.status}`);
  const visibility = visibilityFor(item, policy);
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
  const policy = loadPolicy(registry);
  const sources = sourceCards(registry);
  const validatedSources = new Map();
  for (const item of registry.workItems) {
    if (!sources.has(item.id)) throw new Error(`missing scoped source card ${item.id}`);
    if (!policy.statusMapping.has(item.status)) throw new Error(`unsupported live status for ${item.id}: ${item.status}`);
    normalizeTimestamp(item.updatedAt);
    visibilityFor(item, policy);
    validatedSources.set(item.id, validateSourceCard(item, sources.get(item.id).card, validIds));
  }
  validateDependencyGraph(validatedSources);
  const combined = [sourceBytes.registry, sourceBytes.roadmap, sourceBytes.session, sourceBytes.adapter].map(normalize).join("\n--FITNESS-OWNER-SOURCE--\n");
  const sourceRevision = `sha256:${digest(combined)}`;
  const generatedAt = normalizeTimestamp(registry.updatedAt);
  const cards = registry.workItems.filter((item) => item.status !== "fixed" || (policy.accepted.has(item.id) && visibilityFor(item, policy) === "public")).map((item) => {
    const source = sources.get(item.id);
    return mapCard(item, validatedSources.get(item.id), source.sourcePath, policy);
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
