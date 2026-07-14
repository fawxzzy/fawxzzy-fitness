#!/usr/bin/env node
import fs from "node:fs";
import { register } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { assertExpectedFitnessSupabaseHost, parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";
import {
  applyResolvedFeedbackCardDependencies,
  normalizeFeedbackCardId,
  normalizeFeedbackCardPhase,
  normalizeFeedbackCardPriority,
  normalizeFeedbackDependencyNote,
  normalizeFeedbackDependencyReferences,
} from "./feedback-card-metadata.mjs";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const FALLBACK_SUPABASE_URL_ENV = "SUPABASE_URL";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DEFAULT_STATUS_FILTER = ["new", "needs_info", "confirmed", "fawxzzy_review", "in_progress", "fixed", "closed", "duplicate"];
const STATUS_ORDER = ["new", "needs_info", "confirmed", "fawxzzy_review", "in_progress", "fixed", "closed", "duplicate"];
const VALID_STATUSES = new Set([...STATUS_ORDER, "withdrawn", "spam"]);
const VALID_TYPES = new Set(["bug", "feature"]);
const TYPE_ORDER = ["bug", "feature"];
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 200;
export const DEFAULT_MARKDOWN_OUT = "runtime/feedback-board/latest.md";
export const DEFAULT_JSON_OUT = "runtime/feedback-board/latest.json";
export const DEFAULT_DRAFTS_OUT = "runtime/feedback-board/codex-drafts.md";
export const FEEDBACK_BOARD_EXPORTS_DOC_PATH = "docs/ops/FITNESS-FEEDBACK-BOARD-EXPORTS.md";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");
register("./test-alias-loader.mjs", pathToFileURL(`${scriptDir}${path.sep}`));
const feedbackHelpers = await import(pathToFileURL(path.join(repoRoot, "src", "lib", "discord", "bug-reports.ts")).href);
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const resolvedEnv = {
  ...process.env,
  ...fileEnv,
};

Object.assign(process.env, resolvedEnv);

function getRequiredEnv(name) {
  const value = resolvedEnv[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function getOptionalEnv(name) {
  const value = resolvedEnv[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getSupabaseUrl() {
  const value = getOptionalEnv(SUPABASE_URL_ENV) || getOptionalEnv(FALLBACK_SUPABASE_URL_ENV);
  if (!value) {
    throw new Error(`Missing required env: ${SUPABASE_URL_ENV} or ${FALLBACK_SUPABASE_URL_ENV}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

function getOptionalGuildId() {
  const value = getOptionalEnv("DISCORD_GUILD_ID");
  return value && /^[0-9]{5,32}$/.test(value) ? value : null;
}

function createServiceClient() {
  assertExpectedFitnessSupabaseHost({
    env: resolvedEnv,
    commandName: "feedback board export",
  });

  return createClient(getSupabaseUrl(), getRequiredEnv(SUPABASE_SERVICE_ROLE_KEY_ENV), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : null;
}

function normalizeType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_TYPES.has(normalized) ? normalized : null;
}

function normalizeAreaFilter(value) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    statuses: [...DEFAULT_STATUS_FILTER],
    types: [...TYPE_ORDER],
    area: null,
    limit: DEFAULT_LIMIT,
    includeDuplicates: false,
    includeTesting: false,
    debug: false,
    writeMarkdown: true,
    writeJson: true,
    out: null,
    codexDrafts: false,
  };

  let sawFormatFlag = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--status") {
      const statuses = String(argv[index + 1] ?? "")
        .split(",")
        .map(normalizeStatus)
        .filter(Boolean);
      if (statuses.length > 0) {
        args.statuses = [...new Set(statuses)];
      }
      index += 1;
      continue;
    }

    if (token === "--type") {
      const types = String(argv[index + 1] ?? "")
        .split(",")
        .map(normalizeType)
        .filter(Boolean);
      if (types.length > 0) {
        args.types = [...new Set(types)];
      }
      index += 1;
      continue;
    }

    if (token === "--area") {
      args.area = normalizeAreaFilter(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--limit") {
      const parsedLimit = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
        args.limit = Math.min(parsedLimit, MAX_LIMIT);
      }
      index += 1;
      continue;
    }

    if (token === "--include-duplicates") {
      args.includeDuplicates = true;
      continue;
    }

    if (token === "--include-testing") {
      args.includeTesting = true;
      continue;
    }

    if (token === "--debug") {
      args.debug = true;
      continue;
    }

    if (token === "--markdown") {
      if (!sawFormatFlag) {
        args.writeMarkdown = true;
        args.writeJson = false;
      } else {
        args.writeMarkdown = true;
      }
      sawFormatFlag = true;
      continue;
    }

    if (token === "--json") {
      if (!sawFormatFlag) {
        args.writeMarkdown = false;
        args.writeJson = true;
      } else {
        args.writeJson = true;
      }
      sawFormatFlag = true;
      continue;
    }

    if (token === "--out") {
      args.out = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token === "--codex-drafts") {
      args.codexDrafts = true;
    }
  }

  return args;
}

function resolveStatusFilter(args) {
  const requestedStatuses = args.statuses.filter(Boolean);
  if (requestedStatuses.length === 0) {
    return [...DEFAULT_STATUS_FILTER];
  }

  return requestedStatuses.filter((status) => {
    if (status === "duplicate") {
      return args.includeDuplicates;
    }

    return true;
  });
}

export function resolveOutputPaths(args) {
  const resolved = {};

  const normalizePath = (target) => (path.isAbsolute(target) ? target : path.join(repoRoot, target));
  const resolveDraftPath = (absoluteTarget) => path.join(path.dirname(absoluteTarget), "codex-drafts.md");

  if (args.out) {
    const absoluteTarget = normalizePath(args.out);
    const extension = path.extname(absoluteTarget).toLowerCase();

    if (args.writeMarkdown && !args.writeJson) {
      resolved.markdown = absoluteTarget;
    } else if (args.writeJson && !args.writeMarkdown) {
      resolved.json = absoluteTarget;
    } else if (extension === ".md") {
      resolved.markdown = absoluteTarget;
      resolved.json = absoluteTarget.slice(0, -3) + ".json";
    } else if (extension === ".json") {
      resolved.markdown = absoluteTarget.slice(0, -5) + ".md";
      resolved.json = absoluteTarget;
    } else {
      resolved.markdown = `${absoluteTarget}.md`;
      resolved.json = `${absoluteTarget}.json`;
    }

    if (args.codexDrafts) {
      resolved.codexDrafts = resolveDraftPath(absoluteTarget);
    }
  } else {
    if (args.writeMarkdown) {
      resolved.markdown = path.join(repoRoot, DEFAULT_MARKDOWN_OUT);
    }
    if (args.writeJson) {
      resolved.json = path.join(repoRoot, DEFAULT_JSON_OUT);
    }

    if (args.codexDrafts) {
      resolved.codexDrafts = path.join(repoRoot, DEFAULT_DRAFTS_OUT);
    }
  }

  return resolved;
}

export function maskDiscordUserId(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  return normalized.length <= 4
    ? `${"*".repeat(Math.max(normalized.length - 1, 0))}${normalized.slice(-1)}`
    : `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function formatShortId(value) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.split("-")[0]?.slice(0, 8) ?? normalized.slice(0, 8) : "unknown";
}

function formatStatusLabel(status) {
  switch (status) {
    case "new":
      return "New";
    case "needs_info":
      return "Needs Info";
    case "confirmed":
      return "Confirmed";
    case "fawxzzy_review":
      return "Review";
    case "in_progress":
      return "In Progress";
    case "fixed":
      return "Fixed";
    case "closed":
      return "Closed";
    case "duplicate":
      return "Duplicate";
    case "withdrawn":
      return "Withdrawn";
    case "spam":
      return "Spam";
    default:
      return String(status ?? "Unknown");
  }
}

export function formatDisplayStatusLabel(reportType, status) {
  if (reportType === "feature" && status === "fixed") {
    return "Resolved";
  }

  return formatStatusLabel(status);
}

function isCompletionReviewQueued(record) {
  return (record.status === "fixed" || record.status === "closed")
    && (record.completion_review_status === "pending" || record.completion_review_status === "needs_followup");
}

function titleCase(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return null;
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toForumThreadLink(threadId) {
  const guildId = getOptionalGuildId();
  return guildId && threadId ? `https://discord.com/channels/${guildId}/${threadId}` : null;
}

function buildDescriptionSnippet(row) {
  const detail = typeof row.details === "string" ? row.details.trim() : "";
  if (!detail) {
    return null;
  }

  return detail.length <= 180 ? detail : `${detail.slice(0, 177)}...`;
}

function mapCardEvidence(evidence = []) {
  return evidence.map((item) => ({
    kind: item.kind,
    label: item.label,
    value: item.value,
  }));
}

function buildBoardCardSections(row) {
  const sections = feedbackHelpers.buildDiscordFeedbackCardSections(row);

  return {
    header_label: sections.headerLabel,
    title: sections.title,
    problem: sections.problem,
    expected_behavior: sections.expectedBehavior,
    actual_behavior: sections.actualBehavior,
    steps_to_reproduce: sections.stepsToReproduce,
    user_story: sections.userStory,
    description: sections.description,
    acceptance_criteria: [...sections.acceptanceCriteria],
    evidence: mapCardEvidence(sections.evidence),
    evidence_summary: feedbackHelpers.summarizeDiscordFeedbackEvidence(sections.evidence),
  };
}

function buildBoardCardMetadata(row) {
  return {
    card_id: normalizeFeedbackCardId(row.card_id),
    card_phase: normalizeFeedbackCardPhase(row.card_phase),
    card_priority: normalizeFeedbackCardPriority(row.card_priority),
    depends_on: normalizeFeedbackDependencyReferences(row.depends_on),
    dependency_notes: normalizeFeedbackDependencyNote(row.dependency_notes),
  };
}

export function toBoardRecord(row, debug = false) {
  const reportType = normalizeType(row.report_type) ?? "bug";
  const status = normalizeStatus(row.status) ?? "new";
  const threadId = typeof row.discord_forum_thread_id === "string" ? row.discord_forum_thread_id : null;
  const completionReviewStatus = feedbackHelpers.normalizeDiscordCompletionReviewStatus(row.completion_review_status) ?? "not_required";
  const cardMetadata = buildBoardCardMetadata(row);
  const cardSections = buildBoardCardSections({
    ...row,
    report_type: reportType,
    status,
    severity: typeof row.severity === "string" ? row.severity : "medium",
    ...cardMetadata,
  });

  return {
    id: row.id,
    short_id: formatShortId(row.id),
    report_type: reportType,
    report_type_label: reportType === "feature" ? "Feature" : "Bug",
    status,
    status_label: formatDisplayStatusLabel(reportType, status),
    effort_points: typeof row.effort_points === "number" ? row.effort_points : null,
    card_id: cardMetadata.card_id,
    card_phase: cardMetadata.card_phase,
    card_priority: cardMetadata.card_priority,
    depends_on: [...cardMetadata.depends_on],
    blocks: [],
    dependency_notes: cardMetadata.dependency_notes,
    completion_review_status: completionReviewStatus,
    completion_review_status_label: feedbackHelpers.formatDiscordCompletionReviewStatusLabel(completionReviewStatus),
    completion_review_required: feedbackHelpers.requiresDiscordFeedbackCompletionReview({
      discord_forum_channel_id: typeof row.discord_forum_channel_id === "string" ? row.discord_forum_channel_id : null,
      area: typeof row.area === "string" ? row.area : null,
      summary: typeof row.summary === "string" ? row.summary : "",
      details: typeof row.details === "string" ? row.details : null,
    }),
    completion_review_note: typeof row.completion_review_note === "string" ? row.completion_review_note : null,
    completion_reviewed_at: typeof row.completion_reviewed_at === "string" ? row.completion_reviewed_at : null,
    is_testing_card: feedbackHelpers.isDiscordFeedbackTestingCard({
      discord_forum_channel_id: typeof row.discord_forum_channel_id === "string" ? row.discord_forum_channel_id : null,
      area: typeof row.area === "string" ? row.area : null,
      summary: typeof row.summary === "string" ? row.summary : "",
      details: typeof row.details === "string" ? row.details : null,
    }),
    area: titleCase(row.area) ?? "General",
    title: typeof row.summary === "string" ? row.summary.trim() : "Untitled",
    description: buildDescriptionSnippet(row),
    card_sections: cardSections,
    duplicate_count: Math.max(1, Number(row.duplicate_count ?? 1)),
    attachment_count: Math.max(0, Number(row.attachment_count ?? 0)),
    last_seen_at: row.last_seen_at ?? null,
    forum_thread_link: toForumThreadLink(threadId),
    forum_thread_id: debug ? threadId : undefined,
    latest_update_summary: typeof row.completion_review_note === "string"
      ? row.completion_review_note
      : typeof row.status_note === "string"
        ? row.status_note
        : null,
    reporter_discord_user_id: debug ? row.reporter_discord_user_id ?? null : undefined,
    reporter_discord_user_id_masked: debug ? undefined : maskDiscordUserId(row.reporter_discord_user_id),
  };
}

export function filterBoardRows(rows, args) {
  const allowedStatuses = new Set(resolveStatusFilter(args));
  const allowedTypes = new Set(args.types.filter(Boolean));
  const areaFilter = args.area ? args.area.toLowerCase() : null;

  return rows.filter((row) => {
    const status = normalizeStatus(row.status);
    const reportType = normalizeType(row.report_type);

    if (!status || !reportType || !allowedStatuses.has(status) || !allowedTypes.has(reportType)) {
      return false;
    }

    if (!args.includeDuplicates && status === "duplicate") {
      return false;
    }

    if (areaFilter && String(row.area ?? "").trim().toLowerCase() !== areaFilter) {
      return false;
    }

    if (!args.includeTesting && feedbackHelpers.isDiscordFeedbackTestingCard({
      discord_forum_channel_id: typeof row.discord_forum_channel_id === "string" ? row.discord_forum_channel_id : null,
      area: typeof row.area === "string" ? row.area : null,
      summary: typeof row.summary === "string" ? row.summary : "",
      details: typeof row.details === "string" ? row.details : null,
    })) {
      return false;
    }

    return true;
  });
}

export function groupBoardRecords(records) {
  const grouped = {
    bug: Object.fromEntries(STATUS_ORDER.map((status) => [status, []])),
    feature: Object.fromEntries(STATUS_ORDER.map((status) => [status, []])),
  };

  for (const record of records) {
    if (record.report_type !== "bug" && record.report_type !== "feature") {
      continue;
    }

    grouped[record.report_type][record.status]?.push(record);
  }

  return grouped;
}

function renderBoardListItem(record, debug = false) {
  const parts = [`- [${record.short_id}] ${record.area} — ${record.title}`];
  const metadata = [
    `Status: ${record.status_label}`,
    record.effort_points ? `Points: ${record.effort_points}` : null,
    record.card_id ? `Card ID: ${record.card_id}` : null,
    record.card_priority ? `Priority: ${record.card_priority}` : null,
    record.card_phase ? `Phase: ${record.card_phase}` : null,
    `Duplicates: ${record.duplicate_count}`,
    `Attachments: ${record.attachment_count}`,
    record.last_seen_at ? `Last seen: ${record.last_seen_at}` : null,
    record.forum_thread_link ? `Forum: ${record.forum_thread_link}` : null,
    debug && record.reporter_discord_user_id ? `Reporter ID: ${record.reporter_discord_user_id}` : null,
    !debug && record.reporter_discord_user_id_masked ? `Reporter ID: ${record.reporter_discord_user_id_masked}` : null,
    isCompletionReviewQueued(record) ? `Completion Review: ${record.completion_review_status_label}` : null,
  ].filter(Boolean);

  if (metadata.length > 0) {
    parts.push(`  ${metadata.join(" | ")}`);
  }
  if (Array.isArray(record.depends_on) && record.depends_on.length > 0) {
    parts.push(`  Depends on: ${record.depends_on.join(", ")}`);
  }
  if (Array.isArray(record.blocks) && record.blocks.length > 0) {
    parts.push(`  Blocks: ${record.blocks.join(", ")}`);
  }
  if (record.dependency_notes) {
    parts.push(`  Dependency notes: ${record.dependency_notes}`);
  }

  const cardSections = record.card_sections ?? null;
  if (cardSections?.user_story) {
    parts.push(`  User story: ${cardSections.user_story}`);
  }
  if (cardSections?.problem) {
    parts.push(`  Problem: ${cardSections.problem}`);
  }
  if (cardSections?.description) {
    parts.push(`  Description: ${cardSections.description}`);
  }
  if (cardSections?.expected_behavior) {
    parts.push(`  Expected: ${cardSections.expected_behavior}`);
  }
  if (cardSections?.actual_behavior) {
    parts.push(`  Actual: ${cardSections.actual_behavior}`);
  }
  if (cardSections?.steps_to_reproduce) {
    parts.push(`  Steps: ${cardSections.steps_to_reproduce}`);
  }
  if (Array.isArray(cardSections?.acceptance_criteria) && cardSections.acceptance_criteria.length > 0) {
    parts.push("  Acceptance criteria:");
    for (const criterion of cardSections.acceptance_criteria) {
      parts.push(`    - ${criterion}`);
    }
  }
  if (cardSections?.evidence_summary) {
    parts.push(`  Evidence: ${cardSections.evidence_summary}`);
  }
  if (isCompletionReviewQueued(record) && record.latest_update_summary) {
    parts.push(`  Latest review summary: ${record.latest_update_summary}`);
  }

  return parts.join("\n");
}

function buildCompletionReviewQueue(records) {
  return records.filter((record) => isCompletionReviewQueued(record) && record.completion_review_required && !record.is_testing_card);
}

export function renderBoardMarkdown(records, args = {}) {
  const grouped = groupBoardRecords(records);
  const completionReviewQueue = buildCompletionReviewQueue(records);
  const lines = [
    "# Feedback Board",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
  ];

  for (const reportType of TYPE_ORDER) {
    lines.push(`## ${reportType === "bug" ? "Bugs" : "Features"}`);
    lines.push("");

    let hasItems = false;
    for (const status of STATUS_ORDER) {
      const items = grouped[reportType][status];
      if (!items || items.length === 0) {
        continue;
      }

      hasItems = true;
      lines.push(`### ${formatDisplayStatusLabel(reportType, status)}`);
      for (const record of items) {
        lines.push(renderBoardListItem(record, args.debug));
      }
      lines.push("");
    }

    if (!hasItems) {
      lines.push("No matching cards.");
      lines.push("");
    }
  }

  if (completionReviewQueue.length > 0) {
    lines.push("## Completion Review Queue");
    lines.push("");
    for (const record of completionReviewQueue) {
      lines.push(`- [${record.short_id}] ${record.report_type_label} | ${record.area} | ${record.title}`);
      lines.push(`  Status: ${record.status_label} | Completion Review: ${record.completion_review_status_label}`);
      if (record.effort_points) {
        lines.push(`  Points: ${record.effort_points}`);
      }
      if (Array.isArray(record.card_sections?.acceptance_criteria) && record.card_sections.acceptance_criteria.length > 0) {
        lines.push("  Acceptance criteria:");
        for (const criterion of record.card_sections.acceptance_criteria) {
          lines.push(`    - ${criterion}`);
        }
      }
      if (record.forum_thread_link) {
        lines.push(`  Forum: ${record.forum_thread_link}`);
      }
      if (record.latest_update_summary) {
        lines.push(`  Latest update: ${record.latest_update_summary}`);
      }
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function inferFilesToInspect(record) {
  const area = String(record.area ?? "").toLowerCase();
  const files = [
    "src/app/api/discord/interactions/route.ts",
    "src/lib/discord/bug-reports.ts",
  ];

  if (area.includes("settings") || area.includes("account") || area.includes("discord")) {
    files.push("src/app/settings/page.tsx", "src/components/settings/DiscordAccessSettings.tsx");
  } else if (area.includes("routine")) {
    files.push("src/app/routines/page.tsx", "src/components/routines/RoutinesScreenFamily.tsx");
  } else if (area.includes("session")) {
    files.push("src/app/session/[id]/page.tsx", "src/components/SessionPageClient.tsx");
  } else if (area.includes("history")) {
    files.push("src/app/history/page.tsx", "src/app/history/[sessionId]/page.tsx");
  } else if (area.includes("feedback")) {
    files.push(FEEDBACK_BOARD_EXPORTS_DOC_PATH);
  }

  return [...new Set(files)];
}

export function renderCodexDrafts(records) {
  const eligible = records.filter((record) => record.status === "confirmed" || record.status === "in_progress");
  const lines = [
    "# Feedback Board Codex Drafts",
    "",
    "Draft only — review before execution.",
    "",
  ];

  if (eligible.length === 0) {
    lines.push("No confirmed or in-progress cards matched the current filter.");
    return `${lines.join("\n")}\n`;
  }

  eligible.forEach((record, index) => {
    lines.push(`## Draft ${index + 1} — ${record.report_type_label} / ${record.area} / ${record.title}`);
    lines.push("");
    lines.push("Draft only — review before execution.");
    lines.push("");
    lines.push("Objective");
    lines.push("");
    lines.push(`Address the ${record.report_type.toLowerCase()} card "${record.title}" for the ${record.area} area.`);
    lines.push("");
    lines.push("Context");
    lines.push("");
    lines.push(`- Feedback report IDs: \`${record.short_id}\``);
    lines.push(`- Current board status: ${record.status_label}`);
    lines.push(`- User-facing problem: ${record.description ?? record.title}`);
    if (record.card_id) {
      lines.push(`- Card ID: ${record.card_id}`);
    }
    if (record.card_priority) {
      lines.push(`- Priority: ${record.card_priority}`);
    }
    if (record.card_phase) {
      lines.push(`- Phase: ${record.card_phase}`);
    }
    if (Array.isArray(record.depends_on) && record.depends_on.length > 0) {
      lines.push(`- Depends on: ${record.depends_on.join(", ")}`);
    }
    if (Array.isArray(record.blocks) && record.blocks.length > 0) {
      lines.push(`- Blocks: ${record.blocks.join(", ")}`);
    }
    if (record.forum_thread_link) {
      lines.push(`- Forum thread: ${record.forum_thread_link}`);
    }
    if (record.dependency_notes) {
      lines.push(`- Dependency notes: ${record.dependency_notes}`);
    }
    lines.push("");
    lines.push("Files to inspect");
    lines.push("");
    for (const file of inferFilesToInspect(record)) {
      lines.push(`- ${file}`);
    }
    lines.push("");
    lines.push("Constraints");
    lines.push("");
    lines.push("- Draft only — review before execution.");
    lines.push("- Keep the one-board export workflow intact.");
    lines.push("- Do not create automatic GitHub issues.");
    lines.push("- Do not write to ATLAS automatically.");
    lines.push("- Do not add direct Discord mutation from the board-export draft lane.");
    lines.push("");
    lines.push("Acceptance criteria");
    lines.push("");
    for (const criterion of record.card_sections?.acceptance_criteria ?? []) {
      lines.push(`- ${criterion}`);
    }
    lines.push("- Any changed Discord feedback status copy remains consistent with the board display model.");
    lines.push("- No direct GitHub issue creation or ATLAS writes are added.");
    lines.push("");
    lines.push("Verification");
    lines.push("");
    lines.push("- `npm run typecheck`");
    lines.push("- Run the targeted tests for the affected area.");
    lines.push("- `npm run build`");
    lines.push("");
    lines.push("Docs update");
    lines.push("");
    lines.push(`- ${FEEDBACK_BOARD_EXPORTS_DOC_PATH}`);
    lines.push("- Update product or ops docs if the user-facing workflow or board behavior changes.");
    lines.push("");
  });

  return `${lines.join("\n").trimEnd()}\n`;
}

function ensureDirectoryForFile(target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
}

async function loadRows(client, args) {
  let query = client
    .from("discord_feedback_reports")
    .select([
      "id",
      "report_type",
      "status",
      "severity",
      "effort_points",
      "card_id",
      "card_phase",
      "card_priority",
      "depends_on",
      "dependency_notes",
      "area",
      "summary",
      "details",
      "steps_to_reproduce",
      "screenshot_url",
      "duplicate_count",
      "attachment_count",
      "attachment_metadata",
      "attachment_pruned",
      "discord_forum_channel_id",
      "discord_forum_thread_id",
      "reporter_discord_user_id",
      "last_seen_at",
      "status_note",
      "completion_review_status",
      "completion_reviewed_at",
      "completion_review_note",
    ].join(", "));

  if (args.statuses.length === 1) {
    query = query.eq("status", args.statuses[0]);
  } else if (args.statuses.length > 1) {
    query = query.in("status", args.statuses);
  }

  if (args.types.length === 1) {
    query = query.eq("report_type", args.types[0]);
  } else if (args.types.length > 1) {
    query = query.in("report_type", args.types);
  }

  if (args.area) {
    query = query.eq("area", args.area);
  }

  const { data, error } = await query
    .order("last_seen_at", { ascending: false })
    .limit(args.limit);

  if (error) {
    throw new Error(`Unable to load discord_feedback_reports: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

async function loadDependencyLookupRows(client) {
  const { data, error } = await client
    .from("discord_feedback_reports")
    .select([
      "id",
      "card_id",
      "summary",
      "depends_on",
    ].join(", "))
    .in("status", Array.from(VALID_STATUSES));

  if (error) {
    throw new Error(`Unable to load discord_feedback_reports dependency lookup: ${error.message}`);
  }

  return Array.isArray(data) ? data : [];
}

export async function exportFeedbackBoard({
  client = createServiceClient(),
  args = parseArgs(),
} = {}) {
  const rows = await loadRows(client, args);
  const filteredRows = filterBoardRows(rows, args);
  const dependencyLookupRows = await loadDependencyLookupRows(client);
  const dependencyLookupRecords = dependencyLookupRows.map((row) => ({
    id: row.id,
    short_id: formatShortId(row.id),
    card_id: normalizeFeedbackCardId(row.card_id),
    title: typeof row.summary === "string" ? row.summary.trim() : null,
    depends_on: normalizeFeedbackDependencyReferences(row.depends_on),
  }));
  const records = applyResolvedFeedbackCardDependencies(
    filteredRows.map((row) => toBoardRecord(row, args.debug)),
    {
      lookupRecords: dependencyLookupRecords,
      getShortId: (record) => record.short_id,
      getCardId: (record) => record.card_id,
      getTitle: (record) => record.title,
      getDependsOn: (record) => record.depends_on,
      setResolved: (record, resolved) => ({
        ...record,
        depends_on: resolved.dependsOn,
        blocks: resolved.blocks,
      }),
    },
  );
  const paths = resolveOutputPaths(args);

  if (paths.markdown) {
    ensureDirectoryForFile(paths.markdown);
    fs.writeFileSync(paths.markdown, renderBoardMarkdown(records, args), "utf8");
  }

  if (paths.json) {
    ensureDirectoryForFile(paths.json);
    fs.writeFileSync(paths.json, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  }

  if (paths.codexDrafts) {
    ensureDirectoryForFile(paths.codexDrafts);
    fs.writeFileSync(paths.codexDrafts, renderCodexDrafts(records), "utf8");
  }

  const writtenPaths = Object.values(paths).filter(Boolean);
  if (writtenPaths.length > 0) {
    console.log(`Exported ${records.length} feedback board card${records.length === 1 ? "" : "s"} to ${writtenPaths.join(", ")}`);
  } else {
    console.log(`Generated ${records.length} feedback board card${records.length === 1 ? "" : "s"} without writing files.`);
  }

  return {
    count: records.length,
    records,
    paths,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  exportFeedbackBoard().catch((error) => {
    console.error(`export-feedback-board failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
