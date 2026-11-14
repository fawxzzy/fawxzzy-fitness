// Pure board-event logic: parse, validate and fold board events into the Fitness owner registry.
// No file system, no git, no clock: the same events and the same inputs always produce the same outputs.
// Process, event format and trigger policy: docs/ops/FITNESS-BOARD-SYNC-PROCESS.md.
//
// Ported from the Mazer board fold. Everything project-specific lives in a PROFILE (card id pattern, status
// vocabulary and map, PR repositories, priority codes), so the fold logic is shared, not forked:
// every exported function takes an optional `profile` and defaults to FITNESS_PROFILE.
//
// Differences from the Mazer registry that the fold accounts for:
//   - card prose lives under each registry item's `card` object (title, priority, dependsOn, description,
//     acceptanceCriteria); items without one keep their prose in a generated source file and can only change status.
//   - there is no work ledger: evidence for a card is the merge of its archived events plus the events being folded.
//   - export policy lives in the registry too: a card that reaches the completed state (registry `fixed`) is added to
//     `acceptedPublicCardIds` only when its visibility is explicitly `public`.
import crypto from "node:crypto";
import { screenProblems } from "./public-text-screens.mjs";

export const EVENT_VERSION = 1;

export const FITNESS_PROFILE = Object.freeze({
  id: "fitness",
  cardId: /^FF-[A-Z]+-[0-9]{3}$/,
  cardIdLabel: "FF-AREA-NNN",
  // Event vocabulary. Fitness has no blocked or deferred state.
  statuses: Object.freeze(["planning", "in_progress", "review", "completed"]),
  // Event status -> registry status (what the owner exporter reads).
  statusToRegistry: Object.freeze({ planning: "planning", in_progress: "in_progress", review: "review", completed: "fixed" }),
  // Registry status -> event status, for reading existing cards (`confirmed` and `fawxzzy_review` count as review for the reopen rule).
  registryToEvent: Object.freeze({ fixed: "completed", confirmed: "review", fawxzzy_review: "review", review: "review", in_progress: "in_progress", planning: "planning" }),
  completedRegistryStatus: "fixed",
  repos: Object.freeze({ "fawxzzy/fawxzzy-fitness": "PR", "fawxzzy/FawxzzyWeb": "FawxzzyWeb PR" }),
  priorities: Object.freeze(["P0", "P1", "P2", "P3", null]),
  visibilities: Object.freeze(["public", "private", "unknown"]),
});

export const MAX_TEXT = 700;
export const MAX_TITLE = 90;
export const MAX_DESCRIPTION = 1500;
export const MIN_CRITERIA = 3;
// Generated lines in a card description. Only the newest few stay in the card; every event stays in the archive.
export const KEEP_UPDATE_LINES = 3;
export const UPDATE_MARKER = "Board update ";
const UPDATE_LINE = /(?:^| )Board update \d{4}-\d{2}-\d{2}: .*?(?= Board update \d{4}-\d{2}-\d{2}: |$)/gs;

const ALLOWED_KEYS = new Set(["v", "id", "ts", "card", "status", "text", "title", "description", "acceptanceCriteria", "new", "evidence", "reopen", "by"]);
const EVIDENCE_KEYS = new Set(["prs", "deployedBuild", "headless", "deviceChecked", "checkedOn"]);
const NEW_KEYS = new Set(["title", "description", "priority", "dependencies", "acceptanceCriteria", "visibility"]);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((k) => value[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Content id: first 12 hex chars of sha256 over the canonical event without `id` and `by`. */
export function eventId(event) {
  const { id: _id, by: _by, ...rest } = event;
  return crypto.createHash("sha256").update(canonicalJson(rest)).digest("hex").slice(0, 12);
}

export function withId(event) {
  return { ...event, id: eventId(event) };
}

export function isoDay(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

export function normalizeTs(ts) {
  return new Date(ts).toISOString();
}

/** Parse JSON lines. Returns { events: [{ event, line, source }], errors }. Blank lines are ignored. */
export function parseJsonl(text, source = "events") {
  const events = [];
  const errors = [];
  String(text ?? "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("not an object");
      events.push({ event, line: index + 1, source });
    } catch (error) {
      errors.push(`${source}:${index + 1}: not valid JSON (${error.message})`);
    }
  });
  return { events, errors };
}

const URL_OR_PATH = /https?:\/\/|\b[A-Za-z]:[\\/]|\\\\|(?:^|\s)~\//;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

function textProblems(label, value, max) {
  const out = [];
  if (typeof value !== "string" || !value.trim()) return [`${label} must be a non-empty string`];
  if (value.length > max) out.push(`${label} is ${value.length} chars (max ${max})`);
  if (/[\r\n]/.test(value)) out.push(`${label} must be one line`);
  if (URL_OR_PATH.test(value)) out.push(`${label} must not contain a URL or a file path (public board text)`);
  if (EMAIL.test(value)) out.push(`${label} must not contain an email address`);
  if (value.includes(UPDATE_MARKER)) out.push(`${label} must not contain "${UPDATE_MARKER.trim()}" (reserved for generated lines)`);
  // The shared public-text screens (scripts/board/public-text-screens.mjs), so a string that would not be fit to publish
  // is refused here, before it is written to the events branch and again whenever it is folded or checked.
  out.push(...screenProblems(label, value));
  return out;
}

function criteriaProblems(label, list) {
  if (!Array.isArray(list) || list.length < MIN_CRITERIA) return [`${label} needs at least ${MIN_CRITERIA} entries (exporter rule)`];
  return list.flatMap((c) => textProblems(`${label}[]`, c, 400));
}

/** Shape-only validation of one event line (no registry needed). */
export function validateEventShape(event, profile = FITNESS_PROFILE) {
  const errors = [];
  for (const key of Object.keys(event)) if (!ALLOWED_KEYS.has(key)) errors.push(`unknown field "${key}"`);
  if (event.v !== EVENT_VERSION) errors.push(`v must be ${EVENT_VERSION}`);
  if (typeof event.ts !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(event.ts) || Number.isNaN(Date.parse(event.ts))) errors.push("ts must be an ISO UTC timestamp like 2026-11-13T12:00:00Z");
  if (typeof event.card !== "string" || !profile.cardId.test(event.card)) errors.push(`card must be a stable ${profile.cardIdLabel} id`);
  if (event.status !== undefined && !profile.statuses.includes(event.status)) errors.push(`status must be one of ${profile.statuses.join(", ")}`);
  errors.push(...textProblems("text", event.text, MAX_TEXT));
  if (event.title !== undefined) errors.push(...textProblems("title", event.title, MAX_TITLE));
  // Corrective fields for an EXISTING card (a card being created uses new.description / new.acceptanceCriteria).
  if (event.description !== undefined) {
    if (event.new !== undefined) errors.push("description replaces an existing card's description; a new card uses new.description");
    errors.push(...textProblems("description", event.description, MAX_DESCRIPTION));
  }
  if (event.acceptanceCriteria !== undefined) {
    if (event.new !== undefined) errors.push("acceptanceCriteria replaces an existing card's criteria; a new card uses new.acceptanceCriteria");
    errors.push(...criteriaProblems("acceptanceCriteria", event.acceptanceCriteria));
  }
  if (event.evidence !== undefined) {
    const ev = event.evidence;
    if (!ev || typeof ev !== "object" || Array.isArray(ev)) errors.push("evidence must be an object");
    else {
      for (const key of Object.keys(ev)) if (!EVIDENCE_KEYS.has(key)) errors.push(`evidence has unknown field "${key}"`);
      if (ev.prs !== undefined) {
        if (!Array.isArray(ev.prs)) errors.push("evidence.prs must be an array");
        else for (const pr of ev.prs) {
          if (!pr || !Object.hasOwn(profile.repos, pr.repo)) errors.push(`evidence.prs[].repo must be one of ${Object.keys(profile.repos).join(", ")}`);
          if (!Number.isInteger(pr?.number) || pr.number < 1) errors.push("evidence.prs[].number must be a positive integer");
          if (pr?.mergedSha !== undefined && !/^[0-9a-f]{7,40}$/.test(pr.mergedSha)) errors.push("evidence.prs[].mergedSha must be 7-40 hex chars");
        }
      }
      if (ev.deployedBuild !== undefined && !(typeof ev.deployedBuild === "string" && /^[A-Za-z0-9._-]{4,80}$/.test(ev.deployedBuild))) errors.push("evidence.deployedBuild must be a build name or sha (letters, digits, . _ -)");
      else if (ev.deployedBuild !== undefined) errors.push(...screenProblems("evidence.deployedBuild", ev.deployedBuild));
      if (ev.headless !== undefined && typeof ev.headless !== "boolean") errors.push("evidence.headless must be boolean");
      if (ev.deviceChecked !== undefined && ev.deviceChecked !== null && typeof ev.deviceChecked !== "boolean") errors.push("evidence.deviceChecked must be boolean or null");
      if (ev.deviceChecked === true) errors.push(...(typeof ev.checkedOn === "string" ? textProblems("evidence.checkedOn", ev.checkedOn, 120) : ["evidence.checkedOn (what device and build) is required when deviceChecked is true"]));
    }
  }
  if (event.new !== undefined) {
    const n = event.new;
    if (!n || typeof n !== "object") errors.push("new must be an object");
    else {
      for (const key of Object.keys(n)) if (!NEW_KEYS.has(key)) errors.push(`new has unknown field "${key}"`);
      errors.push(...textProblems("new.title", n.title, MAX_TITLE));
      errors.push(...textProblems("new.description", n.description, MAX_DESCRIPTION));
      if (!profile.priorities.includes(n.priority ?? null)) errors.push(`new.priority must be ${profile.priorities.map((p) => p ?? "null").join(", ")}`);
      if (!profile.visibilities.includes(n.visibility)) errors.push(`new.visibility must be one of ${profile.visibilities.join(", ")} (the exporter requires an explicit decision for every new card)`);
      if (!Array.isArray(n.dependencies ?? [])) errors.push("new.dependencies must be an array of card ids");
      errors.push(...criteriaProblems("new.acceptanceCriteria", n.acceptanceCriteria));
    }
  }
  return errors;
}

/**
 * The sentence generated from the evidence the event itself carries, so card text cannot contradict the evidence fields.
 * `after` is the merged evidence (used only to say "merged, not deployed" when no build is recorded).
 */
export function evidenceSentence(evidence, after = evidence, profile = FITNESS_PROFILE) {
  if (!evidence) return "";
  const parts = [];
  const prs = (evidence.prs ?? []).map((p) => {
    const label = `${profile.repos[p.repo] ?? "PR"} #${p.number}`;
    return p.mergedSha ? `${label} merged (${p.mergedSha.slice(0, 8)})` : `${label} open`;
  });
  if (prs.length) parts.push(`${prs.join(", ")}.`);
  const merged = (evidence.prs ?? []).some((p) => p.mergedSha);
  if (evidence.deployedBuild) parts.push(`Deployed: production build ${evidence.deployedBuild}.`);
  else if (merged && after?.deviceChecked === null) parts.push("No runtime surface to deploy.");
  else if (merged && !after?.deployedBuild) parts.push("Merged, not deployed.");
  if (evidence.deviceChecked === true) parts.push(`Checked on a real device: ${evidence.checkedOn}.`);
  else if (evidence.deviceChecked === false) {
    parts.push((evidence.headless ?? after?.headless) ? "Checked only in headless Chromium, not on a real phone." : "Unit tests only: no browser or phone check.");
  } else if (evidence.deviceChecked === null) parts.push("No device surface.");
  else if (evidence.headless === true) parts.push("Headless Chromium run recorded.");
  return parts.join(" ");
}

export function mergeEvidence(current, incoming) {
  const base = current ?? { prs: [], headless: false, deviceChecked: false };
  const out = { ...base, prs: [...(base.prs ?? [])] };
  for (const pr of incoming.prs ?? []) {
    const at = out.prs.findIndex((p) => p.repo === pr.repo && p.number === pr.number);
    if (at < 0) out.prs.push({ repo: pr.repo, number: pr.number, ...(pr.mergedSha ? { mergedSha: pr.mergedSha } : {}) });
    else if (pr.mergedSha) out.prs[at] = { ...out.prs[at], mergedSha: pr.mergedSha };
  }
  if (incoming.deployedBuild !== undefined) out.deployedBuild = incoming.deployedBuild;
  if (incoming.headless !== undefined) out.headless = incoming.headless;
  if (incoming.deviceChecked !== undefined) out.deviceChecked = incoming.deviceChecked;
  if (incoming.checkedOn !== undefined) out.checkedOn = incoming.checkedOn;
  return out;
}

/** Evidence tier rules for `completed`: merged AND deployed, device state explicit. Returns problems. */
export function completedProblems(id, evidence) {
  const out = [];
  if (!evidence) return [`${id}: completed needs evidence (a merged PR and a deployed build)`];
  if (!(evidence.prs ?? []).some((p) => p.mergedSha)) out.push(`${id}: completed needs a merged PR (evidence.prs[].mergedSha); use review for open or unmerged work`);
  if (!evidence.deployedBuild && evidence.deviceChecked !== null) out.push(`${id}: completed needs evidence.deployedBuild (merged is not deployed); use review, or set deviceChecked null for work with no runtime surface`);
  if (typeof evidence.headless !== "boolean") out.push(`${id}: evidence.headless must be recorded`);
  if (evidence.deviceChecked === true && !evidence.checkedOn) out.push(`${id}: deviceChecked true needs checkedOn`);
  return out;
}

function renderUpdateLine(event, evidenceAfter, hasEvidence, profile) {
  const tail = hasEvidence ? ` ${evidenceSentence(event.evidence, evidenceAfter, profile)}` : "";
  return `${UPDATE_MARKER}${isoDay(event.ts)}: ${event.text.trim()}${tail}`.trimEnd();
}

/** Append a generated line and keep only the newest KEEP_UPDATE_LINES generated lines. */
export function appendUpdateLine(description, line) {
  const lines = description.match(UPDATE_LINE)?.map((l) => l.trim()) ?? [];
  const base = description.replace(UPDATE_LINE, "").trimEnd();
  const kept = [...lines, line].slice(-KEEP_UPDATE_LINES);
  return `${base} ${kept.join(" ")}`.trim();
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const byTs = (a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0);

/** Evidence per card, rebuilt from the archived events in timestamp order (the archive is the only evidence store). */
export function evidenceFromArchive(events) {
  const map = new Map();
  for (const event of [...events].sort(byTs)) {
    if (event?.evidence && typeof event.card === "string") map.set(event.card, mergeEvidence(map.get(event.card), event.evidence));
  }
  return map;
}

/**
 * Fold events into a copy of the registry.
 * @param {{registry: object, events: Array<{event: object, source?: string, line?: number}>, appliedIds?: Set<string>, priorEvents?: object[], profile?: object}} input
 *   `priorEvents` are the already-archived events: they supply each card's earlier evidence.
 * @returns {{registry, applied: object[], skipped: object[], errors: string[], warnings: string[], changes: object[]}}
 */
export function foldEvents({ registry: registryIn, events, appliedIds = new Set(), priorEvents = [], profile = FITNESS_PROFILE }) {
  const registry = clone(registryIn);
  const errors = [];
  const warnings = [];
  const skipped = [];
  const applied = [];
  const changes = new Map();
  const where = (item) => `${item.source ?? "events"}${item.line ? `:${item.line}` : ""}`;
  if (!Array.isArray(registry.acceptedPublicCardIds)) return { registry, applied, skipped, errors: ["registry acceptedPublicCardIds must be an array"], warnings, changes: [] };
  const evidenceByCard = evidenceFromArchive(priorEvents);

  // 1. shape, id integrity, de-duplication
  const seen = new Map();
  const candidates = [];
  for (const item of events) {
    const event = item.event;
    const shape = validateEventShape(event, profile);
    if (shape.length) { errors.push(...shape.map((e) => `${where(item)} ${event.card ?? "?"}: ${e}`)); continue; }
    const expected = eventId(event);
    if (event.id !== undefined && event.id !== expected) { errors.push(`${where(item)} ${event.card}: id ${event.id} does not match the content (${expected}); a recorded event was edited`); continue; }
    const id = expected;
    if (appliedIds.has(id)) { skipped.push({ id, card: event.card, reason: "already applied" }); continue; }
    if (seen.has(id)) { skipped.push({ id, card: event.card, reason: "duplicate in this run" }); continue; }
    seen.set(id, true);
    candidates.push({ ...item, event: { ...event, id } });
  }
  candidates.sort((a, b) => byTs(a.event, b.event));

  const byId = new Map(registry.workItems.map((item) => [item.id, item]));
  const record = (id, from) => { if (!changes.has(id)) changes.set(id, { card: id, from, to: null, events: 0, created: false, allowlisted: false }); return changes.get(id); };

  // 2. fold in timestamp order
  for (const item of candidates) {
    const event = item.event;
    const problems = [];
    let work = byId.get(event.card);
    const creating = event.new !== undefined;
    if (creating) {
      if (work) problems.push("new card id already exists in the registry");
      for (const dep of event.new.dependencies ?? []) if (!byId.has(dep)) problems.push(`dependency ${dep} is not a registry card`);
      if (event.status === "completed") problems.push("a new card cannot be created as completed");
    } else if (!work) problems.push("card is not in the registry (create it with a `new` block)");
    if (problems.length) { errors.push(...problems.map((p) => `${where(item)} ${event.card}: ${p}`)); continue; }

    let evidence = clone(evidenceByCard.get(event.card) ?? null);
    if (creating) {
      work = {
        id: event.card, status: profile.statusToRegistry[event.status ?? "planning"], updatedAt: normalizeTs(event.ts), visibility: event.new.visibility,
        card: {
          title: event.new.title, priority: event.new.priority ?? null, dependsOn: [...(event.new.dependencies ?? [])],
          description: event.new.description, acceptanceCriteria: [...event.new.acceptanceCriteria],
        },
      };
    }
    const before = work.status;
    const nextStatus = event.status ? profile.statusToRegistry[event.status] : before;
    if (event.status && before === profile.completedRegistryStatus && nextStatus !== profile.completedRegistryStatus && !event.reopen) problems.push("completed cards do not move back without `reopen: true`");
    const next = clone(work);
    next.status = nextStatus;
    const hasCard = next.card && typeof next.card === "object" && !Array.isArray(next.card);
    if (!hasCard) {
      // The prose of this card lives in a generated source file (roadmap or session cards), not in the registry.
      for (const field of ["title", "description", "acceptanceCriteria"]) if (event[field] !== undefined) problems.push(`${field} cannot be replaced: this card's text lives in a generated source file, not in the registry card store`);
      if (!creating) warnings.push(`${where(item)} ${event.card}: only the status changes; the text of this card is generated elsewhere, so the update line is kept in the archive, not published`);
    } else {
      if (event.title) next.card.title = event.title;
      // Corrective replacement of published text (events are append-only, so a bad description is fixed by a new event).
      // `description` replaces the whole description, earlier generated lines included (they stay in the archive).
      if (event.description !== undefined) next.card.description = event.description.trim();
      if (event.acceptanceCriteria !== undefined) next.card.acceptanceCriteria = event.acceptanceCriteria.map((c) => c.trim());
    }
    if (event.evidence) evidence = mergeEvidence(evidence, event.evidence);
    if (event.status === "completed") problems.push(...completedProblems(event.card, evidence));
    if (next.status === "review" && !evidence) warnings.push(`${where(item)} ${event.card}: review without any PR evidence`);
    if (work.updatedAt && normalizeTs(event.ts) < normalizeTs(work.updatedAt) && !creating) warnings.push(`${where(item)} ${event.card}: event is older than the card's updatedAt (${work.updatedAt}); applied anyway`);
    if (problems.length) { errors.push(...problems.map((p) => `${where(item)} ${p.startsWith(event.card) ? p : `${event.card}: ${p}`}`)); continue; }

    if (hasCard && !creating) next.card.description = appendUpdateLine(next.card.description, renderUpdateLine(event, evidence, Boolean(event.evidence), profile));
    // Second screen, on the card text exactly as it would be published (title, and description with the generated line).
    if (hasCard) {
      const published = [...screenProblems("resulting title", next.card.title), ...screenProblems("resulting description", next.card.description)];
      if (published.length) { errors.push(...published.map((p) => `${where(item)} ${event.card}: ${p}`)); continue; }
    }
    next.updatedAt = normalizeTs(event.ts);

    // Allowlist upkeep: a public card that reaches the completed state must be accepted, or the exporter silently drops it.
    let allowlisted = false;
    if (next.status === profile.completedRegistryStatus && before !== profile.completedRegistryStatus) {
      if (next.visibility === "public") {
        if (!registry.acceptedPublicCardIds.includes(next.id)) { registry.acceptedPublicCardIds.push(next.id); allowlisted = true; }
      } else if (next.visibility === undefined) warnings.push(`${where(item)} ${event.card}: completed with no explicit visibility, so it is NOT added to acceptedPublicCardIds and stays off the public board until the owner decides`);
      else warnings.push(`${where(item)} ${event.card}: completed with visibility "${next.visibility}", so it stays off the public board`);
    }

    if (creating) { registry.workItems.push(next); byId.set(next.id, next); }
    else { Object.assign(work, next); }
    if (evidence) evidenceByCard.set(event.card, evidence);

    const change = record(event.card, creating ? null : before);
    change.to = next.status;
    change.events += 1;
    change.created = change.created || creating;
    change.allowlisted = change.allowlisted || allowlisted;
    if (event.evidence?.deployedBuild) change.deployedBuild = event.evidence.deployedBuild;
    for (const pr of event.evidence?.prs ?? []) (change.prs ??= []).push(profile.repos[pr.repo] === "PR" ? `#${pr.number}` : `FawxzzyWeb#${pr.number}`);
    applied.push(event);
  }

  if (applied.length) registry.updatedAt = applied.map((e) => normalizeTs(e.ts)).sort().at(-1);
  return { registry, applied, skipped, errors, warnings, changes: [...changes.values()] };
}

/** Trigger policy: due when enough events or the oldest pending event is old enough. */
export const DEFAULT_POLICY = Object.freeze({ minEvents: 12, maxAgeDays: 7 });

export function dueStatus(pending, nowMs, policy = DEFAULT_POLICY) {
  const oldest = pending.map((e) => Date.parse(e.ts)).sort((a, b) => a - b)[0];
  const ageDays = oldest === undefined ? 0 : (nowMs - oldest) / 86_400_000;
  const reasons = [];
  if (pending.length >= policy.minEvents) reasons.push(`${pending.length} pending events (limit ${policy.minEvents})`);
  if (pending.length > 0 && ageDays >= policy.maxAgeDays) reasons.push(`oldest pending event is ${ageDays.toFixed(1)} days old (limit ${policy.maxAgeDays})`);
  return { due: reasons.length > 0, reasons, ageDays: oldest === undefined ? null : Number(ageDays.toFixed(1)) };
}
