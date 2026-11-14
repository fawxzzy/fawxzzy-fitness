#!/usr/bin/env node
// Fitness board sync: append cheap board events during work, fold them into the owner registry card store and the
// owner export in one deterministic command. No LLM, no network except `event`/`status`/`flush`.
//
//   node scripts/board/board-sync.mjs event --card FF-X-001 --status review --text "..." [--title ..] [--description ..] [--pr 492:<mergedSha>] [--webpr 120:<sha>] [--deployed <build>] [--headless] [--device false|true|none]
//   node scripts/board/board-sync.mjs status [--due]        pending count, oldest age, board-as-of marker (exit 3 with --due when not due)
//   node scripts/board/board-sync.mjs plan                  dry-run diff of folding every pending event (writes nothing)
//   node scripts/board/board-sync.mjs apply                 fold + write registry and archive, regenerate the owner export with the exporter
//   node scripts/board/board-sync.mjs check                 archive/registry integrity, then `npm run project-board:owner-export:check`
//   node scripts/board/board-sync.mjs web --web <dir> [--write]   re-pin the FawxzzyWeb snapshot inputs
//   node scripts/board/board-sync.mjs flush                 push events that were saved locally while offline
// Process, event format, trigger policy and rollback: docs/ops/FITNESS-BOARD-SYNC-PROCESS.md.
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildProjectBoardOwnerExport } from "../export-project-board-owner.mjs";
import {
  DEFAULT_POLICY, FITNESS_PROFILE, dueStatus, eventId, foldEvents, parseJsonl, validateEventShape, withId, canonicalJson,
} from "./board-events.mjs";
import { screenProblems } from "./public-text-screens.mjs";
import { patchRegistryText } from "./registry-text.mjs";
import { repinWeb, WEB_FILES, WEB_NEXT_COMMANDS } from "./web-repin.mjs";

export const REGISTRY_PATH = "config/fitness-owner-work-registry.json";
export const ARCHIVE_PATH = "config/fitness-board-events.jsonl";
export const EXPORT_PATH = "exports/fitness.project-board.owner-export.v1.json";
// The four sources the exporter hashes into source_revision, in its order (registry, roadmap, session, adapter).
const EXPORT_SOURCE_PATHS = { registry: REGISTRY_PATH, roadmap: "scripts/feedback-monetization-roadmap.mjs", session: "scripts/feedback-session-exercise-timer-cards.mjs", adapter: "scripts/export-project-board-owner.mjs" };
const EXPORTER_SCRIPT = EXPORT_SOURCE_PATHS.adapter;
// The existing CI checks for the owner export. `check` and `apply` reuse them, they are not reimplemented here.
export const OWNER_EXPORT_CHECK_SCRIPT = "project-board:owner-export:check";
export const OWNER_EXPORT_TEST_SCRIPT = "test:project-board-owner-export";
const OWNER_EXPORT_TEST_FILE = "tests/project-board-owner-export.test.mjs";
export const EVENTS_BRANCH = "board-events";
export const EVENTS_FILE = "events.jsonl";

const toLf = (text) => text.replace(/\r\n/g, "\n");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function git(repoRoot, args, options = {}) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1 << 28, ...options });
}

// ---- event store: a branch with one file (plumbing only: never touches a working tree) -------------------------------

export function readRemoteEvents(repoRoot, remote = "origin") {
  try { git(repoRoot, ["fetch", "--quiet", remote, `+refs/heads/${EVENTS_BRANCH}:refs/remotes/${remote}/${EVENTS_BRANCH}`]); } catch { /* branch may not exist yet */ }
  try { return git(repoRoot, ["show", `refs/remotes/${remote}/${EVENTS_BRANCH}:${EVENTS_FILE}`]); } catch { return ""; }
}

export function localFallbackPath(repoRoot) {
  const common = git(repoRoot, ["rev-parse", "--git-common-dir"]).trim();
  return path.join(path.resolve(repoRoot, common), "fitness-board-events.local.jsonl");
}

function pushLines(repoRoot, lines, remote = "origin") {
  const env = { ...process.env, GIT_AUTHOR_NAME: "fitness-board-events", GIT_AUTHOR_EMAIL: "board-events@users.noreply.github.com", GIT_COMMITTER_NAME: "fitness-board-events", GIT_COMMITTER_EMAIL: "board-events@users.noreply.github.com" };
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const current = readRemoteEvents(repoRoot, remote);
    const have = new Set(parseJsonl(current).events.map((e) => e.event.id));
    const fresh = lines.filter((l) => !have.has(JSON.parse(l).id));
    if (!fresh.length) return { pushed: 0 };
    const next = `${current}${current && !current.endsWith("\n") ? "\n" : ""}${fresh.join("\n")}\n`;
    const blob = git(repoRoot, ["hash-object", "-w", "--stdin"], { input: next, env }).trim();
    const tree = git(repoRoot, ["mktree"], { input: `100644 blob ${blob}\t${EVENTS_FILE}\n`, env }).trim();
    let parent = "";
    try { parent = git(repoRoot, ["rev-parse", "--verify", "--quiet", `refs/remotes/${remote}/${EVENTS_BRANCH}`]).trim(); } catch { /* first event */ }
    const message = `board events: ${fresh.map((l) => JSON.parse(l).card).join(", ")}`;
    const commit = git(repoRoot, ["commit-tree", tree, ...(parent ? ["-p", parent] : []), "-m", message], { env }).trim();
    try {
      git(repoRoot, ["push", "--quiet", remote, `${commit}:refs/heads/${EVENTS_BRANCH}`], { env });
      return { pushed: fresh.length, commit };
    } catch (error) { lastError = error; }
  }
  throw new Error(`could not push board events after 6 attempts: ${String(lastError?.stderr ?? lastError).trim()}`);
}

export function appendEvent(repoRoot, event, { remote = "origin", offlineOk = true } = {}) {
  const full = withId(event);
  const errors = validateEventShape(full);
  if (errors.length) throw new Error(`event rejected:\n  ${errors.join("\n  ")}`);
  const line = canonicalJson(full);
  const local = localFallbackPath(repoRoot);
  const queued = fs.existsSync(local) ? fs.readFileSync(local, "utf8").split("\n").filter(Boolean) : [];
  try {
    const result = pushLines(repoRoot, [...queued, line], remote);
    if (queued.length) fs.writeFileSync(local, "");
    return { id: full.id, where: `${remote}/${EVENTS_BRANCH}`, ...result };
  } catch (error) {
    if (!offlineOk) throw error;
    if (!queued.includes(line)) fs.appendFileSync(local, `${line}\n`);
    return { id: full.id, where: "local fallback (offline); run `flush` later", pushed: 0, warning: String(error.message).split("\n")[0] };
  }
}

export function flushLocal(repoRoot, remote = "origin") {
  const local = localFallbackPath(repoRoot);
  const queued = fs.existsSync(local) ? fs.readFileSync(local, "utf8").split("\n").filter(Boolean) : [];
  if (!queued.length) return { flushed: 0 };
  const result = pushLines(repoRoot, queued, remote);
  fs.writeFileSync(local, "");
  return { flushed: queued.length, ...result };
}

// ---- inputs ---------------------------------------------------------------------------------------------------------

function loadState(repoRoot) {
  const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
  const registryRaw = read(REGISTRY_PATH);
  const archivePath = path.join(repoRoot, ARCHIVE_PATH);
  const archiveRaw = fs.existsSync(archivePath) ? fs.readFileSync(archivePath, "utf8") : "";
  return { registryRaw, archiveRaw, registry: JSON.parse(registryRaw) };
}

function loadPending(repoRoot, options) {
  const items = [];
  const errors = [];
  const add = (text, source) => { const parsed = parseJsonl(text, source); items.push(...parsed.events); errors.push(...parsed.errors); };
  if (options.eventFiles?.length) for (const file of options.eventFiles) add(fs.readFileSync(file, "utf8"), file);
  else {
    if (!options.noRemote) add(readRemoteEvents(repoRoot, options.remote), `${options.remote ?? "origin"}/${EVENTS_BRANCH}`);
    const local = localFallbackPath(repoRoot);
    if (fs.existsSync(local)) add(fs.readFileSync(local, "utf8"), "local fallback");
  }
  return { items, errors };
}

function archiveIds(archiveRaw) {
  const { events, errors } = parseJsonl(archiveRaw, ARCHIVE_PATH);
  return { ids: new Set(events.map((e) => e.event.id)), events, errors };
}

/** Export sources exactly as the exporter reads them, with the registry text replaced (used to build the export in memory). */
function readExportSources(repoRoot, registryText) {
  const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
  return { registry: registryText, roadmap: read(EXPORT_SOURCE_PATHS.roadmap), session: read(EXPORT_SOURCE_PATHS.session), adapter: read(EXPORTER_SCRIPT) };
}

// ---- plan / apply ---------------------------------------------------------------------------------------------------

export function computePlan(repoRoot, options = {}) {
  const state = loadState(repoRoot);
  const pending = loadPending(repoRoot, options);
  const archived = archiveIds(state.archiveRaw);
  const fold = foldEvents({ registry: state.registry, events: pending.items, appliedIds: archived.ids, priorEvents: archived.events.map((e) => e.event), profile: FITNESS_PROFILE });
  const errors = [...pending.errors, ...archived.errors, ...fold.errors];
  const plan = { state, fold, errors, archived, outputs: null, exportText: null, summary: null };
  // With nothing to apply the plan is a strict no-op: no registry, archive or export byte is produced or compared.
  if (errors.length || !fold.applied.length) return plan;

  const totalApplied = archived.events.length + fold.applied.length;
  fold.registry.provenance = { ...(fold.registry.provenance ?? {}), boardSync: { at: fold.registry.updatedAt, appliedEventCount: totalApplied, lastEventId: fold.applied.at(-1).id } };
  // Style-preserving patch (the registry is hand-formatted): only touched blocks change, and the result is verified against the fold.
  let registryText;
  try { registryText = patchRegistryText(state.registryRaw, state.registry, fold.registry); }
  catch (error) { errors.push(error.message); return plan; }
  const archiveAppend = fold.applied.map((e) => `${canonicalJson(e)}\n`).join("");

  // Build the export in memory with the exporter first: a rejected export aborts before any file is written.
  let exportText;
  try { exportText = `${JSON.stringify(buildProjectBoardOwnerExport(JSON.parse(registryText), readExportSources(repoRoot, registryText)), null, 2)}\n`; }
  catch (error) { errors.push(`owner export rejected the folded registry: ${error.message}`); return plan; }
  plan.exportText = exportText;
  plan.outputs = {
    [REGISTRY_PATH]: registryText,
    [ARCHIVE_PATH]: `${state.archiveRaw}${state.archiveRaw && !state.archiveRaw.endsWith("\n") ? "\n" : ""}${archiveAppend}`,
  };
  const exportedBefore = readExportedIds(repoRoot);
  const exportedAfter = JSON.parse(exportText).cards.map((c) => c.record.card_id);
  plan.summary = {
    events: fold.applied.length,
    alreadyApplied: fold.skipped.length,
    cardsChanged: fold.changes.length,
    newCards: fold.changes.filter((c) => c.created).map((c) => c.card),
    cards: state.registry.workItems.length + fold.changes.filter((c) => c.created).length,
    registryBytesDelta: toLf(registryText).length - toLf(state.registryRaw).length,
    exportSha256: sha256(exportText),
    exportedCards: exportedAfter.length,
    exportAdded: exportedAfter.filter((id) => !exportedBefore.includes(id)),
    exportRemoved: exportedBefore.filter((id) => !exportedAfter.includes(id)),
    registryUpdatedAt: fold.registry.updatedAt,
  };
  return plan;
}

function readExportedIds(repoRoot) {
  try { return JSON.parse(fs.readFileSync(path.join(repoRoot, EXPORT_PATH), "utf8")).cards.map((c) => c.record.card_id); } catch { return []; }
}

export function formatPlan(plan) {
  const L = [];
  const { fold, errors, summary } = plan;
  if (errors.length) { L.push(`board-sync: REFUSED, ${errors.length} problem(s); nothing written`); for (const e of errors) L.push(`  - ${e}`); }
  for (const w of fold.warnings) L.push(`  warning: ${w}`);
  if (errors.length) return L.join("\n");
  if (!fold.applied.length) return [...L, `board-sync: nothing to apply (${fold.skipped.length} event(s) already in the archive); registry, archive and owner export stay unchanged`].join("\n");
  L.push(`board-sync plan: ${summary.events} event(s) -> ${summary.cardsChanged} card(s) changed, ${summary.newCards.length} new (${summary.cards} cards total); registry ${summary.registryBytesDelta >= 0 ? "+" : ""}${summary.registryBytesDelta} bytes; ${summary.alreadyApplied} already applied`);
  for (const c of fold.changes) {
    const move = c.created ? `NEW (${c.to})` : c.from === c.to ? `${c.to} (text only)` : `${c.from} -> ${c.to}`;
    L.push(`  ${c.card.padEnd(22)} ${move}${c.allowlisted ? "  +acceptedPublicCardIds" : ""}${c.prs ? `  ${c.prs.join(" ")}` : ""}${c.deployedBuild ? `  deployed ${c.deployedBuild}` : ""}${c.events > 1 ? `  (${c.events} events)` : ""}`);
  }
  L.push(`  owner export: ${summary.exportedCards} cards (+${summary.exportAdded.length}${summary.exportAdded.length ? ` ${summary.exportAdded.join(",")}` : ""}, -${summary.exportRemoved.length}${summary.exportRemoved.length ? ` ${summary.exportRemoved.join(",")}` : ""}); sha256 ${summary.exportSha256}; registry updatedAt ${summary.registryUpdatedAt}`);
  return L.join("\n");
}

export function applyPlan(repoRoot, plan) {
  if (plan.errors.length || !plan.outputs) throw new Error("refusing to apply a plan with problems");
  for (const [rel, text] of Object.entries(plan.outputs)) {
    const file = path.join(repoRoot, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text, "utf8");
  }
}

// ---- owner export tooling: the existing exporter and the existing CI checks, never reimplemented -------------------------

function run(repoRoot, command, args) {
  try { return { ok: true, output: execFileSync(command, args, { cwd: repoRoot, encoding: "utf8", stdio: "pipe", shell: process.platform === "win32" && command === "npm" }) }; }
  catch (error) { return { ok: false, output: `${error.stdout ?? ""}${error.stderr ?? ""}`.trim() || String(error.message) }; }
}

export const ownerExportTools = {
  /** Regenerate the owner export with the existing exporter (`npm run project-board:owner-export`, run as its script). */
  regenerate: (repoRoot) => run(repoRoot, process.execPath, [EXPORTER_SCRIPT]),
  /** `npm run project-board:owner-export:check`: the staleness check CI runs. */
  check: (repoRoot) => run(repoRoot, "npm", ["run", "--silent", OWNER_EXPORT_CHECK_SCRIPT]),
  /** `npm run test:project-board-owner-export`: the pinned-expectations test CI runs. */
  test: (repoRoot) => (fs.existsSync(path.join(repoRoot, OWNER_EXPORT_TEST_FILE)) ? run(repoRoot, process.execPath, ["--test", OWNER_EXPORT_TEST_FILE]) : { ok: true, skipped: true, output: "" }),
};

// ---- status / check ---------------------------------------------------------------------------------------------------

export function computeStatus(repoRoot, options = {}, nowMs = Date.now()) {
  const state = loadState(repoRoot);
  const pending = loadPending(repoRoot, options);
  const archived = archiveIds(state.archiveRaw);
  const unique = new Map();
  for (const { event } of pending.items) {
    const id = event.id ?? (validateEventShape(event).length ? null : eventId(event));
    if (id && !archived.ids.has(id)) unique.set(id, event);
  }
  const open = [...unique.values()];
  const policy = { minEvents: options.minEvents ?? DEFAULT_POLICY.minEvents, maxAgeDays: options.maxAgeDays ?? DEFAULT_POLICY.maxAgeDays };
  const due = dueStatus(open, nowMs, policy);
  const sync = state.registry.provenance?.boardSync;
  const asOf = state.registry.updatedAt;
  return {
    asOf, lastSync: sync?.at ?? null, pending: open.length, malformed: pending.errors.length, ...due, policy,
    line: `Board as of ${asOf.slice(0, 10)}${sync ? ` (last sync ${sync.at.slice(0, 10)}, ${sync.appliedEventCount} events applied in total)` : ""}, ${open.length} pending event${open.length === 1 ? "" : "s"}${due.ageDays !== null ? `, oldest ${due.ageDays} d` : ""}. ${due.due ? `SYNC DUE: ${due.reasons.join("; ")}.` : "Not due."}`,
  };
}

/** Offline integrity of the registry card store, the archive and the allowlist (no network, no git). */
export function checkIntegrity(repoRoot) {
  const state = loadState(repoRoot);
  const errors = [];
  const ids = state.registry.workItems.map((c) => c.id);
  if (new Set(ids).size !== ids.length) errors.push("registry has duplicate card ids");
  const idSet = new Set(ids);
  const byId = new Map(state.registry.workItems.map((c) => [c.id, c]));
  const accepted = state.registry.acceptedPublicCardIds ?? [];
  if (!Array.isArray(state.registry.acceptedPublicCardIds)) errors.push("registry acceptedPublicCardIds must be an array");
  if (new Set(accepted).size !== accepted.length) errors.push("acceptedPublicCardIds has duplicates");
  for (const id of accepted) if (!idSet.has(id)) errors.push(`acceptedPublicCardIds names ${id}, which is not in the registry`);
  // The text of every card that is on the published board must pass the shared public-text screens.
  for (const id of readExportedIds(repoRoot)) {
    const card = byId.get(id)?.card;
    if (!card) continue;
    errors.push(...screenProblems(`${REGISTRY_PATH}#${id} title`, card.title), ...screenProblems(`${REGISTRY_PATH}#${id} description`, card.description));
  }
  const archived = archiveIds(state.archiveRaw);
  errors.push(...archived.errors);
  const seen = new Set();
  const completedByEvent = new Set();
  for (const { event, line } of archived.events) {
    const shape = validateEventShape(event, FITNESS_PROFILE);
    if (shape.length) errors.push(`${ARCHIVE_PATH}:${line}: ${shape.join("; ")}`);
    else if (event.id !== eventId(event)) errors.push(`${ARCHIVE_PATH}:${line}: id does not match content (an archived event was edited)`);
    if (seen.has(event.id)) errors.push(`${ARCHIVE_PATH}:${line}: duplicate event id ${event.id}`);
    seen.add(event.id);
    if (!idSet.has(event.card)) errors.push(`${ARCHIVE_PATH}:${line}: card ${event.card} is not in the registry`);
    if (event.status === "completed") completedByEvent.add(event.card);
  }
  // A public card the board completed must still be accepted, or the exporter silently drops it.
  for (const id of completedByEvent) {
    const item = byId.get(id);
    if (item?.status === FITNESS_PROFILE.completedRegistryStatus && item.visibility === "public" && !accepted.includes(id)) errors.push(`${id} was completed by a board event and is public, but is missing from acceptedPublicCardIds`);
  }
  const sync = state.registry.provenance?.boardSync;
  if (sync && sync.appliedEventCount !== archived.events.length) errors.push(`provenance.boardSync.appliedEventCount (${sync.appliedEventCount}) does not match the archive (${archived.events.length})`);
  if (!sync && archived.events.length) errors.push(`${ARCHIVE_PATH} has ${archived.events.length} event(s) but the registry has no provenance.boardSync`);
  return { errors, cards: ids.length, archived: archived.events.length };
}

// ---- CLI --------------------------------------------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { _: [], prs: [], eventFiles: [] };
  const flagsWithValue = new Set(["card", "status", "text", "title", "deployed", "device", "checked-on", "description", "pr", "webpr", "events", "web", "max-events", "max-days", "remote", "json", "by", "ts"]);
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith("--")) { out._.push(a); continue; }
    const key = a.slice(2);
    if (flagsWithValue.has(key)) {
      const value = argv[++i];
      if (value === undefined) throw new Error(`--${key} needs a value`);
      if (key === "pr" || key === "webpr") out.prs.push({ repo: key === "pr" ? "fawxzzy/fawxzzy-fitness" : "fawxzzy/FawxzzyWeb", value });
      else if (key === "events") out.eventFiles.push(value);
      else out[key] = value;
    } else out[key] = true;
  }
  return out;
}

function eventFromArgs(args) {
  if (args.json) return JSON.parse(args.json);
  const event = { v: 1, ts: args.ts ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), card: args.card, text: args.text };
  if (args.status) event.status = args.status;
  if (args.title) event.title = args.title;
  if (args.description) event.description = args.description;
  if (args.by) event.by = args.by;
  const evidence = {};
  if (args.prs.length) evidence.prs = args.prs.map(({ repo, value }) => { const [n, sha] = value.split(":"); return { repo, number: Number(n), ...(sha ? { mergedSha: sha } : {}) }; });
  if (args.deployed) evidence.deployedBuild = args.deployed;
  if (args.headless) evidence.headless = true;
  if (args.device !== undefined) evidence.deviceChecked = args.device === "true" ? true : args.device === "none" ? null : false;
  if (args["checked-on"]) evidence.checkedOn = args["checked-on"];
  if (Object.keys(evidence).length) event.evidence = evidence;
  return event;
}

export function runBoardSync(argv, repoRoot = process.cwd(), out = (line) => process.stdout.write(`${line}\n`), deps = {}) {
  const args = parseArgs(argv);
  const command = args._[0];
  const tools = { ...ownerExportTools, ...(deps.ownerExportTools ?? {}) };
  const options = { eventFiles: args.eventFiles, remote: args.remote ?? "origin", noRemote: Boolean(args["no-remote"]), minEvents: args["max-events"] ? Number(args["max-events"]) : undefined, maxAgeDays: args["max-days"] ? Number(args["max-days"]) : undefined };
  if (command === "event") {
    const result = appendEvent(repoRoot, eventFromArgs(args), { remote: options.remote });
    out(`board event ${result.id} recorded in ${result.where}${result.warning ? ` (${result.warning})` : ""}`);
    return 0;
  }
  if (command === "flush") { const r = flushLocal(repoRoot, options.remote); out(`board-sync: flushed ${r.flushed} locally saved event(s)`); return 0; }
  if (command === "status") {
    const status = computeStatus(repoRoot, options);
    out(status.line);
    if (status.malformed) out(`warning: ${status.malformed} malformed pending line(s) will block apply`);
    return args.due && !status.due ? 3 : 0;
  }
  if (command === "plan" || command === "apply") {
    const plan = computePlan(repoRoot, options);
    out(formatPlan(plan));
    if (plan.errors.length) return 2;
    if (command === "apply" && plan.outputs) {
      // Write registry + archive, regenerate the export with the existing exporter, run the CI checks, restore everything on failure.
      const touched = [...Object.keys(plan.outputs), EXPORT_PATH];
      const snapshot = touched.map((rel) => { const file = path.join(repoRoot, rel); return [file, fs.existsSync(file) ? fs.readFileSync(file) : null]; });
      const restore = () => { for (const [file, content] of snapshot) { if (content === null) fs.rmSync(file, { force: true }); else fs.writeFileSync(file, content); } };
      const refuse = (label, output) => {
        restore();
        out(`board-sync: REFUSED, ${label}; every file restored, nothing left written`);
        for (const line of String(output).split("\n").slice(0, 25)) out(`      ${line}`);
        return 2;
      };
      applyPlan(repoRoot, plan);
      const regen = tools.regenerate(repoRoot);
      if (!regen.ok) return refuse("the owner exporter failed on the folded registry", regen.output);
      const exportFile = path.join(repoRoot, EXPORT_PATH);
      if (toLf(fs.readFileSync(exportFile, "utf8")) !== toLf(plan.exportText)) return refuse("the regenerated owner export differs from the planned export", "exporter output and in-memory build disagree");
      const check = tools.check(repoRoot);
      if (!check.ok) return refuse(`npm run ${OWNER_EXPORT_CHECK_SCRIPT} fails on the folded result`, check.output);
      out(`board-sync: owner export regenerated and \`npm run ${OWNER_EXPORT_CHECK_SCRIPT}\` passed`);
      out(`board-sync: wrote ${touched.join(", ")}`);
      // The pinned-expectations test is the other CI check. Its pins describe the board as last accepted, so a real status
      // change can need a same-PR pin update. That is reported loudly and exits 4; the written files are kept for the operator.
      const pins = tools.test(repoRoot);
      if (!pins.ok) {
        out(`board-sync: WRITTEN, BUT \`npm run ${OWNER_EXPORT_TEST_SCRIPT}\` FAILS: update the pinned expectations in ${OWNER_EXPORT_TEST_FILE} in the SAME pull request, or CI will fail`);
        for (const line of String(pins.output).split("\n").slice(0, 25)) out(`      ${line}`);
        return 4;
      }
      out(pins.skipped ? `board-sync: ${OWNER_EXPORT_TEST_FILE} not present here, pin test skipped` : `board-sync: \`npm run ${OWNER_EXPORT_TEST_SCRIPT}\` passed`);
      out("Next: commit those files in one pull request, wait for CI, merge, then run `web --web <FawxzzyWeb worktree> --write` and the Web checks.");
    } else if (command === "plan") out("(dry run: nothing written; run apply to write)");
    return 0;
  }
  if (command === "check") {
    const result = checkIntegrity(repoRoot);
    if (result.errors.length) { out(`board-sync check: FAILED\n  - ${result.errors.join("\n  - ")}`); return 2; }
    const exportCheck = tools.check(repoRoot);
    if (!exportCheck.ok) { out(`board-sync check: FAILED, \`npm run ${OWNER_EXPORT_CHECK_SCRIPT}\`:\n${exportCheck.output.split("\n").slice(0, 15).join("\n")}`); return 2; }
    out(`board-sync check: ok (${result.cards} cards, ${result.archived} archived events, owner export check passed)`);
    return 0;
  }
  if (command === "web") {
    if (!args.web) throw new Error("web needs --web <FawxzzyWeb worktree>");
    const result = repinWeb({ webDir: path.resolve(args.web), exportPath: path.join(repoRoot, EXPORT_PATH), write: Boolean(args.write) });
    out(`board-sync web: ${args.write ? "wrote" : "would write (dry run, add --write)"} ${result.cards} cards, export sha256 ${result.sha256}`);
    for (const e of result.edits) out(`  ${e}`);
    out(`Next in the Web worktree: ${WEB_NEXT_COMMANDS.join(" ; ")}; stage only: ${result.files.join(", ")}, ${WEB_FILES.snapshot}`);
    return 0;
  }
  out("usage: board-sync.mjs <event|status|plan|apply|check|web|flush> [options]; see docs/ops/FITNESS-BOARD-SYNC-PROCESS.md");
  return command ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = runBoardSync(process.argv.slice(2)); }
  catch (error) { console.error(`board-sync: ${error.message}`); process.exitCode = 1; }
}
