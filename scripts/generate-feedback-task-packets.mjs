#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..");

export const DEFAULT_FROM = "runtime/feedback-board/latest.json";
export const DEFAULT_OUT_DIR = "runtime/feedback-tasks";
export const DEFAULT_MARKDOWN_OUT = "latest.md";
export const DEFAULT_JSON_OUT = "latest.json";
export const DEFAULT_PROMPTS_OUT = "codex-prompts.md";
export const DEFAULT_DECISIONS_EXAMPLE_OUT = "review-decisions.example.json";

export const DEFAULT_STATUSES = ["confirmed", "in_progress", "fawxzzy_review"];
export const DEFAULT_TYPES = ["bug", "feature"];
export const ACTIVE_IMPLEMENTATION_STATUSES = ["confirmed", "in_progress", "fawxzzy_review"];
export const PENDING_COMPLETION_REVIEW_STATUSES = ["pending", "needs_followup"];
export const VALID_STATUSES = new Set([
  "new",
  "needs_info",
  "confirmed",
  "fawxzzy_review",
  "in_progress",
  "fixed",
  "closed",
  "duplicate",
  "spam",
  "withdrawn",
]);
export const VALID_TYPES = new Set(["bug", "feature"]);
export const VALID_DECISIONS = new Set(["approve", "defer", "reject", "needs_info"]);
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

const TOKEN_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "button",
  "card",
  "cards",
  "feature",
  "for",
  "from",
  "goal",
  "here",
  "in",
  "is",
  "issue",
  "it",
  "its",
  "lane",
  "new",
  "of",
  "on",
  "or",
  "screen",
  "the",
  "to",
  "update",
  "workflow",
]);

const AREA_FILE_HINTS = [
  {
    match: /discord|feedback|security|moderation|verify|verification|updates?/i,
    files: [
      "src/app/api/discord/interactions/route.ts",
      "src/lib/discord/bug-reports.ts",
      "src/lib/discord/interactions.ts",
    ],
    docs: [
      "docs/ops/FITNESS-DISCORD-FEEDBACK.md",
      "docs/ops/FITNESS-DISCORD-UPDATES.md",
    ],
  },
  {
    match: /routine/i,
    files: [
      "src/app/routines/page.tsx",
      "src/app/routines/new/page.tsx",
      "src/components/routines/RoutinesScreenFamily.tsx",
    ],
    docs: [],
  },
  {
    match: /session|today/i,
    files: [
      "src/app/today/page.tsx",
      "src/app/session/[id]/page.tsx",
      "src/components/SessionPageClient.tsx",
    ],
    docs: [],
  },
  {
    match: /history/i,
    files: [
      "src/app/history/page.tsx",
      "src/app/history/[sessionId]/page.tsx",
      "src/lib/history-sessions-page-loader.ts",
    ],
    docs: [],
  },
  {
    match: /account|settings/i,
    files: [
      "src/app/settings/page.tsx",
      "src/components/settings/SettingsAccordionClient.tsx",
      "src/components/settings/DiscordAccessSettings.tsx",
    ],
    docs: [],
  },
];

function normalizeStatus(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : null;
}

function normalizeType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_TYPES.has(normalized) ? normalized : null;
}

function normalizeDecision(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_DECISIONS.has(normalized) ? normalized : null;
}

function toAbsoluteRepoPath(target) {
  return path.isAbsolute(target) ? target : path.join(repoRoot, target);
}

function ensureDir(targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
}

function safeTitleCase(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "General";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function shortId(id) {
  const normalized = String(id ?? "").trim();
  return normalized ? normalized.split("-")[0]?.slice(0, 8) ?? normalized.slice(0, 8) : "unknown";
}

function stablePacketId(reportIds) {
  const hash = createHash("sha1")
    .update(reportIds.join(","))
    .digest("hex")
    .slice(0, 10);
  return `packet-${hash}`;
}

function sanitizeMultilineText(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function sentenceCase(value) {
  const normalized = sanitizeMultilineText(value);
  if (!normalized) {
    return null;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function tokenizeTopic(value) {
  return [...new Set(
    sanitizeMultilineText(value)
      .toLowerCase()
      .match(/[a-z0-9]+/g)?.filter((token) => token.length > 2 && !TOKEN_STOPWORDS.has(token)) ?? [],
  )];
}

function tokenSimilarity(left, right) {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.max(left.length, right.length);
}

function clipped(value, maxLength) {
  const normalized = sanitizeMultilineText(value);
  if (!normalized) {
    return null;
  }

  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    from: path.join(repoRoot, DEFAULT_FROM),
    outDir: path.join(repoRoot, DEFAULT_OUT_DIR),
    statuses: [...DEFAULT_STATUSES],
    types: [...DEFAULT_TYPES],
    area: null,
    limit: DEFAULT_LIMIT,
    codexPrompts: false,
    includeCompletedReview: false,
    debug: false,
    decisions: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--from") {
      args.from = toAbsoluteRepoPath(argv[index + 1] ?? DEFAULT_FROM);
      index += 1;
      continue;
    }

    if (token === "--type") {
      const values = String(argv[index + 1] ?? "")
        .split(",")
        .map(normalizeType)
        .filter(Boolean);
      if (values.length > 0) {
        args.types = [...new Set(values)];
      }
      index += 1;
      continue;
    }

    if (token === "--status") {
      const values = String(argv[index + 1] ?? "")
        .split(",")
        .map(normalizeStatus)
        .filter(Boolean);
      if (values.length > 0) {
        args.statuses = [...new Set(values)];
      }
      index += 1;
      continue;
    }

    if (token === "--area") {
      const area = sanitizeMultilineText(argv[index + 1] ?? "");
      args.area = area || null;
      index += 1;
      continue;
    }

    if (token === "--limit") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        args.limit = Math.min(parsed, MAX_LIMIT);
      }
      index += 1;
      continue;
    }

    if (token === "--codex-prompts") {
      args.codexPrompts = true;
      continue;
    }

    if (token === "--include-completed-review") {
      args.includeCompletedReview = true;
      continue;
    }

    if (token === "--out") {
      args.outDir = toAbsoluteRepoPath(argv[index + 1] ?? DEFAULT_OUT_DIR);
      index += 1;
      continue;
    }

    if (token === "--decisions") {
      args.decisions = toAbsoluteRepoPath(argv[index + 1] ?? "");
      index += 1;
      continue;
    }

    if (token === "--debug") {
      args.debug = true;
    }
  }

  return args;
}

export function resolveOutputPaths(args) {
  return {
    markdown: path.join(args.outDir, DEFAULT_MARKDOWN_OUT),
    json: path.join(args.outDir, DEFAULT_JSON_OUT),
    prompts: args.codexPrompts ? path.join(args.outDir, DEFAULT_PROMPTS_OUT) : null,
    decisionsExample: path.join(args.outDir, DEFAULT_DECISIONS_EXAMPLE_OUT),
  };
}

function normalizeBoardRecord(input, index) {
  const reportType = normalizeType(input?.report_type);
  const status = normalizeStatus(input?.status);
  if (!reportType || !status || typeof input?.id !== "string") {
    return null;
  }

  const area = safeTitleCase(input.area);
  const title = clipped(input.title ?? input.summary ?? `Feedback card ${index + 1}`, 120) ?? `Feedback card ${index + 1}`;
  const description = clipped(input.description ?? input.details ?? "", 320);
  const duplicateCount = Math.max(1, Number(input.duplicate_count ?? 1));
  const attachmentCount = Math.max(0, Number(input.attachment_count ?? 0));
  const forumThreadLink = typeof input.forum_thread_link === "string" ? input.forum_thread_link.trim() : null;
  const tokens = tokenizeTopic(`${title} ${description ?? ""}`);
  const completionReviewStatus = typeof input.completion_review_status === "string"
    ? input.completion_review_status.trim().toLowerCase()
    : "not_required";
  const cardSections = input?.card_sections && typeof input.card_sections === "object"
    ? {
      headerLabel: clipped(input.card_sections.header_label, 80),
      title: clipped(input.card_sections.title, 160),
      problem: clipped(input.card_sections.problem, 400),
      expectedBehavior: clipped(input.card_sections.expected_behavior, 300),
      actualBehavior: clipped(input.card_sections.actual_behavior, 400),
      stepsToReproduce: clipped(input.card_sections.steps_to_reproduce, 400),
      userStory: clipped(input.card_sections.user_story, 300),
      description: clipped(input.card_sections.description, 400),
      acceptanceCriteria: Array.isArray(input.card_sections.acceptance_criteria)
        ? input.card_sections.acceptance_criteria
          .map((item) => clipped(item, 180))
          .filter(Boolean)
        : [],
      evidenceSummary: clipped(input.card_sections.evidence_summary, 240),
    }
    : {
      headerLabel: reportType === "feature" ? "Feature Request" : "Bug Report",
      title,
      problem: reportType === "bug" ? description : null,
      expectedBehavior: null,
      actualBehavior: reportType === "bug" ? description : null,
      stepsToReproduce: null,
      userStory: null,
      description: reportType === "feature" ? description : null,
      acceptanceCriteria: [],
      evidenceSummary: null,
    };

  return {
    id: input.id,
    shortId: shortId(input.id),
    reportType,
    status,
    area,
    title,
    description,
    duplicateCount,
    attachmentCount,
    forumThreadLink: forumThreadLink || null,
    lastSeenAt: typeof input.last_seen_at === "string" ? input.last_seen_at : null,
    completionReviewStatus,
    completionReviewRequired: Boolean(input.completion_review_required),
    completionReviewNote: clipped(input.completion_review_note ?? input.latest_update_summary ?? "", 240),
    completionReviewedAt: clipped(input.completion_reviewed_at, 80),
    isTestingCard: Boolean(input.is_testing_card),
    cardSections,
    debugReporterDiscordUserId: typeof input.reporter_discord_user_id === "string" ? input.reporter_discord_user_id : null,
    topicTokens: tokens,
  };
}

export function isActiveImplementationStatus(record) {
  return ACTIVE_IMPLEMENTATION_STATUSES.includes(record.status);
}

export function isPendingCompletionReview(record) {
  return (record.status === "fixed" || record.status === "closed")
    && PENDING_COMPLETION_REVIEW_STATUSES.includes(record.completionReviewStatus)
    && record.completionReviewRequired;
}

export function shouldIncludeInTaskPackets(record, args) {
  const allowedTypes = new Set(args.types.map(normalizeType).filter(Boolean));
  const allowedStatuses = new Set(args.statuses.map(normalizeStatus).filter(Boolean));
  const areaFilter = args.area ? args.area.trim().toLowerCase() : null;

  if (!allowedTypes.has(record.reportType)) {
    return false;
  }

  if (record.isTestingCard) {
    return false;
  }

  if (areaFilter && record.area.toLowerCase() !== areaFilter) {
    return false;
  }

  if (args.includeCompletedReview && isPendingCompletionReview(record)) {
    return true;
  }

  return isActiveImplementationStatus(record) && allowedStatuses.has(record.status);
}

export function loadBoardRecords(sourcePath) {
  const raw = fs.readFileSync(sourcePath, "utf8");
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : [];
  if (!Array.isArray(rows)) {
    throw new Error("Feedback board input must be an array or an object with a records array.");
  }

  return rows
    .map((row, index) => normalizeBoardRecord(row, index))
    .filter((row) => Boolean(row));
}

export function filterBoardRecords(records, args) {
  return records
    .filter((record) => shouldIncludeInTaskPackets(record, args))
    .slice(0, args.limit);
}

function shouldGroupTogether(record, candidatePacket) {
  if (record.reportType !== candidatePacket.reportType || record.area !== candidatePacket.area) {
    return false;
  }

  const similarity = tokenSimilarity(record.topicTokens, candidatePacket.topicTokens);
  return similarity >= 0.5 || (
    record.topicTokens.length > 0
    && candidatePacket.topicTokens.length > 0
    && record.topicTokens.some((token) => candidatePacket.topicTokens.includes(token))
    && record.duplicateCount > 1
  );
}

export function groupRecordsIntoPackets(records) {
  const packets = [];

  for (const record of records) {
    const existing = packets.find((packet) => shouldGroupTogether(record, packet));
    if (existing) {
      existing.records.push(record);
      existing.topicTokens = [...new Set([...existing.topicTokens, ...record.topicTokens])];
      continue;
    }

    packets.push({
      reportType: record.reportType,
      area: record.area,
      topicTokens: [...record.topicTokens],
      records: [record],
    });
  }

  return packets;
}

function suggestedPriority(packet) {
  const hasInProgress = packet.records.some((record) => record.status === "in_progress");
  const duplicateSignals = packet.records.reduce((sum, record) => sum + record.duplicateCount, 0);
  const attachments = packet.records.reduce((sum, record) => sum + record.attachmentCount, 0);

  if (hasInProgress) {
    return "high";
  }

  if (packet.reportType === "bug" && (duplicateSignals >= 3 || attachments > 0)) {
    return "high";
  }

  if (packet.reportType === "feature" && duplicateSignals >= 3) {
    return "medium";
  }

  return packet.reportType === "bug" ? "medium" : "low";
}

function commonTopicTitle(packet) {
  if (packet.records.length === 1) {
    return packet.records[0].title;
  }

  const frequency = new Map();
  for (const token of packet.topicTokens) {
    frequency.set(token, 0);
  }

  for (const record of packet.records) {
    for (const token of record.topicTokens) {
      frequency.set(token, (frequency.get(token) ?? 0) + 1);
    }
  }

  const commonTokens = [...frequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([token]) => token);

  if (commonTokens.length === 0) {
    return `${packet.area} shared work`;
  }

  return commonTokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function summarizeProblemStatement(packet) {
  if (packet.records.length === 1) {
    return sentenceCase(packet.records[0].description ?? packet.records[0].title) ?? packet.records[0].title;
  }

  const fragments = packet.records.map((record) => `${record.title}: ${record.description ?? "No extra summary provided."}`);
  return clipped(fragments.join(" "), 600) ?? `${packet.records.length} related feedback cards need a reviewed implementation pass.`;
}

function buildEvidenceSummary(packet) {
  const lines = [];
  const duplicateSignals = packet.records.reduce((sum, record) => sum + record.duplicateCount, 0);
  const attachments = packet.records.reduce((sum, record) => sum + record.attachmentCount, 0);

  lines.push(
    packet.records.length === 1
      ? `1 feedback card is in scope for this packet.`
      : `${packet.records.length} related feedback cards were grouped into this implementation candidate.`,
  );
  lines.push(`Duplicate signals across the packet: ${duplicateSignals}.`);
  lines.push(`Attachments referenced across the packet: ${attachments}.`);

  const descriptions = packet.records
    .map((record) => record.description)
    .filter(Boolean)
    .slice(0, 3)
    .map((description) => `- ${description}`);
  if (descriptions.length > 0) {
    lines.push("Evidence snippets:");
    lines.push(...descriptions);
  }

  const cardSectionSummaries = packet.records
    .map((record) => record.cardSections?.evidenceSummary)
    .filter(Boolean)
    .slice(0, 2);
  if (cardSectionSummaries.length > 0) {
    lines.push("Card evidence:");
    for (const summary of cardSectionSummaries) {
      lines.push(`- ${summary}`);
    }
  }

  return lines;
}

function inferFilesAndDocs(packet) {
  const files = new Set(["src/app/api/discord/interactions/route.ts"]);
  const docs = new Set();
  const searchText = `${packet.area} ${packet.records.map((record) => `${record.title} ${record.description ?? ""}`).join(" ")}`;

  for (const hint of AREA_FILE_HINTS) {
    if (!hint.match.test(searchText)) {
      continue;
    }

    for (const file of hint.files) {
      files.add(file);
    }
    for (const docPath of hint.docs) {
      docs.add(docPath);
    }
  }

  if (packet.reportType === "feature") {
    docs.add("docs/ops/FITNESS-FEEDBACK-REVIEWED-TASKS.md");
  }

  return {
    filesToInspect: [...files],
    docsPaths: [...docs],
  };
}

function buildImplementationHypothesis(packet) {
  if (packet.reportType === "bug") {
    return `Trace the ${packet.area} user flow from the files below, confirm where the observed behavior diverges from the feedback evidence, and patch the narrowest path that restores the expected result without changing unrelated Discord or app workflows.`;
  }

  return `Start from the ${packet.area} user flow and existing feedback/forum logic, then add the smallest user-facing implementation slice that satisfies the packet evidence without creating a second task system or auto-promotion path.`;
}

function buildAcceptanceCriteria(packet) {
  const criteria = [];

  for (const record of packet.records) {
    for (const criterion of record.cardSections?.acceptanceCriteria ?? []) {
      if (!criteria.includes(criterion)) {
        criteria.push(criterion);
      }
    }
  }

  criteria.push(
    "Existing Discord feedback, update-bot, and review handoff contracts remain intact.",
    "No automatic GitHub issue creation, ATLAS write, Discord mutation, or Supabase mutation is added to the task-packet generator lane.",
  );

  if (packet.records.some((record) => record.forumThreadLink)) {
    criteria.push("Any shipped work can be mapped back to the source feedback card(s) for manual status updates.");
  }

  return criteria;
}

function buildVerificationChecklist(packet) {
  const checks = [
    "Inspect the relevant user flow before changing code.",
    "Run `npm run typecheck`.",
    "Run the targeted tests for the affected files or feature area.",
    "Run `npm run build`.",
  ];

  if (/discord|feedback|security|updates?|verify/i.test(packet.area)) {
    checks.push("Review whether the shipped behavior needs a manual `/feedback-status fixed` follow-up or a curated Update Bot post.");
  }

  return checks;
}

function buildStatusSuggestions(packet) {
  const suggestions = [];
  if (packet.records.some((record) => record.status === "confirmed")) {
    suggestions.push("Suggest `/feedback-status in_progress` after human review approves the implementation start.");
  }

  suggestions.push("Suggest `/feedback-status fixed` after the implementation is shipped and verified.");
  return suggestions;
}

function buildCompletionReviewChecklist(record) {
  return [
    "Confirm the change was deployed to the intended Fitness environment.",
    "Confirm the feedback thread has the expected audit comment history.",
    "Confirm the relevant QA evidence was actually completed for this card.",
    "Confirm any required user-facing `#updates` post exists only if the change shipped publicly.",
    "Check the implemented behavior against the card Acceptance Criteria.",
    "Check that unrelated scope creep was not bundled into the finished work.",
    "Decide whether this card should stay fixed/completed, move back to in_progress, or become follow-up work.",
  ];
}

function buildCompletionReviewPacket(record) {
  return {
    reviewId: `completion-review-${record.shortId}`,
    reportId: record.id,
    shortId: record.shortId,
    reportType: record.reportType,
    reportTypeLabel: record.reportType === "feature" ? "Feature" : "Bug",
    area: record.area,
    title: record.title,
    status: record.status,
    statusLabel: record.reportType === "feature" && record.status === "fixed" ? "Completed" : safeTitleCase(record.status.replace(/_/g, " ")),
    completionReviewStatus: record.completionReviewStatus,
    completionReviewStatusLabel: safeTitleCase(record.completionReviewStatus.replace(/_/g, " ")),
    forumThreadLink: record.forumThreadLink,
    acceptanceCriteria: [...(record.cardSections?.acceptanceCriteria ?? [])],
    latestUpdateSummary: record.completionReviewNote,
    reviewChecklist: buildCompletionReviewChecklist(record),
  };
}

export function finalizePacket(packet, args, decisionMap = new Map()) {
  const sortedRecords = [...packet.records].sort((left, right) => {
    const leftStatusWeight = DEFAULT_STATUSES.indexOf(left.status);
    const rightStatusWeight = DEFAULT_STATUSES.indexOf(right.status);
    return (leftStatusWeight === -1 ? 99 : leftStatusWeight) - (rightStatusWeight === -1 ? 99 : rightStatusWeight);
  });
  const ids = sortedRecords.map((record) => record.id);
  const packetId = stablePacketId(ids);
  const review = decisionMap.get(packetId) ?? {
    decision: "pending",
    reviewer: null,
    notes: null,
    approvedAt: null,
  };
  const filesAndDocs = inferFilesAndDocs(packet);

  const result = {
    packetId,
    feedbackReportIds: ids,
    feedbackShortIds: sortedRecords.map((record) => record.shortId),
    reportType: packet.reportType,
    area: packet.area,
    title: commonTopicTitle(packet),
    problemStatement: summarizeProblemStatement(packet),
    cardSections: sortedRecords.map((record) => ({
      reportId: record.id,
      shortId: record.shortId,
      headerLabel: record.cardSections.headerLabel,
      title: record.cardSections.title,
      problem: record.cardSections.problem,
      expectedBehavior: record.cardSections.expectedBehavior,
      actualBehavior: record.cardSections.actualBehavior,
      stepsToReproduce: record.cardSections.stepsToReproduce,
      userStory: record.cardSections.userStory,
      description: record.cardSections.description,
      acceptanceCriteria: record.cardSections.acceptanceCriteria,
      evidenceSummary: record.cardSections.evidenceSummary,
    })),
    evidenceSummary: buildEvidenceSummary(packet),
    attachmentsCount: sortedRecords.reduce((sum, record) => sum + record.attachmentCount, 0),
    forumThreadLinks: sortedRecords.map((record) => record.forumThreadLink).filter(Boolean),
    duplicateCount: sortedRecords.reduce((sum, record) => sum + record.duplicateCount, 0),
    suggestedPriority: suggestedPriority(packet),
    implementationHypothesis: buildImplementationHypothesis(packet),
    filesToInspect: filesAndDocs.filesToInspect,
    acceptanceCriteria: buildAcceptanceCriteria(packet),
    verificationChecklist: buildVerificationChecklist(packet),
    docsUpdateNeeded: {
      required: filesAndDocs.docsPaths.length > 0,
      suggestedPaths: filesAndDocs.docsPaths,
    },
    reviewerDecision: review.decision,
    reviewer: review.reviewer,
    reviewerNotes: review.notes,
    approvedAt: review.approvedAt,
    statusSuggestions: buildStatusSuggestions(packet),
  };

  if (args.debug) {
    result.debug = {
      records: sortedRecords.map((record) => ({
        id: record.id,
        reporterDiscordUserId: record.debugReporterDiscordUserId,
        lastSeenAt: record.lastSeenAt,
      })),
    };
  }

  return result;
}

function sortPacketsForReview(packets) {
  const active = [];
  const summary = {
    approve: [],
    defer: [],
    reject: [],
    needs_info: [],
  };

  for (const packet of packets) {
    if (packet.reviewerDecision === "approve") {
      active.push(packet);
      continue;
    }

    if (packet.reviewerDecision === "defer" || packet.reviewerDecision === "reject" || packet.reviewerDecision === "needs_info") {
      summary[packet.reviewerDecision].push({
        packetId: packet.packetId,
        title: packet.title,
        area: packet.area,
        reviewer: packet.reviewer,
        notes: packet.reviewerNotes,
      });
      continue;
    }

    active.push(packet);
  }

  active.sort((left, right) => {
    const leftPriority = left.reviewerDecision === "approve" ? 0 : 1;
    const rightPriority = right.reviewerDecision === "approve" ? 0 : 1;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.packetId.localeCompare(right.packetId);
  });

  return { active, summary };
}

export function loadReviewDecisions(decisionsPath) {
  if (!decisionsPath) {
    return new Map();
  }

  const raw = fs.readFileSync(decisionsPath, "utf8");
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  const map = new Map();

  for (const row of rows) {
    const packetId = sanitizeMultilineText(row?.packetId);
    const decision = normalizeDecision(row?.decision);
    if (!packetId || !decision) {
      continue;
    }

    map.set(packetId, {
      decision,
      reviewer: clipped(row?.reviewer, 120),
      notes: clipped(row?.notes, 500),
      approvedAt: clipped(row?.approvedAt, 80),
    });
  }

  return map;
}

export function buildReviewDecisionsExample(packetId = "packet-0000000000") {
  return [
    {
      packetId,
      decision: "approve",
      reviewer: "reviewer-name",
      notes: "Scoped and approved for a reviewed Codex implementation pass.",
      approvedAt: new Date().toISOString(),
    },
  ];
}

export function renderPacketMarkdown(result) {
  const lines = [
    "# Feedback Reviewed Task Packets",
    "",
    `Generated: ${result.generatedAt}`,
    `Source: ${result.sourcePath}`,
    "",
    "## Filters",
    "",
    `- Types: ${result.filters.types.join(", ")}`,
    `- Statuses: ${result.filters.statuses.join(", ")}`,
    `- Area: ${result.filters.area ?? "all"}`,
    `- Limit: ${result.filters.limit}`,
    "",
    "## Summary",
    "",
    `- Input cards: ${result.summary.inputCards}`,
    `- Included cards: ${result.summary.includedCards}`,
    `- Implementation cards: ${result.summary.implementationCards}`,
    `- Completion-review cards: ${result.summary.completionReviewCards}`,
    `- Active packets: ${result.summary.activePackets}`,
    `- Completion-review packets: ${result.summary.completionReviewPackets}`,
    `- Approved packets: ${result.summary.approvedPackets}`,
    `- Deferred packets: ${result.summary.deferredPackets}`,
    `- Rejected packets: ${result.summary.rejectedPackets}`,
    `- Needs-info packets: ${result.summary.needsInfoPackets}`,
    "",
  ];

  if (result.packets.length === 0) {
    lines.push("No active packets matched the current review filter.");
    lines.push("");
  } else {
    lines.push("## Active Packets");
    lines.push("");
    for (const packet of result.packets) {
      lines.push(`### ${packet.title} (${packet.packetId})`);
      lines.push("");
      lines.push(`- Area: ${packet.area}`);
      lines.push(`- Type: ${packet.reportType}`);
      lines.push(`- Priority: ${packet.suggestedPriority}`);
      lines.push(`- Reviewer decision: ${packet.reviewerDecision}`);
      lines.push(`- Feedback IDs: ${packet.feedbackShortIds.map((id) => `\`${id}\``).join(", ")}`);
      lines.push(`- Attachment count: ${packet.attachmentsCount}`);
      lines.push(`- Duplicate count: ${packet.duplicateCount}`);
      lines.push("");
      lines.push("Problem statement:");
      lines.push(packet.problemStatement);
      lines.push("");
      lines.push("Evidence summary:");
      for (const item of packet.evidenceSummary) {
        lines.push(item.startsWith("- ") ? item : `- ${item}`);
      }
      lines.push("");
      if (packet.cardSections.length > 0) {
        lines.push("Card sections:");
        for (const section of packet.cardSections) {
          lines.push(`- ${section.shortId} | ${section.headerLabel}`);
          if (section.userStory) {
            lines.push(`  User Story: ${section.userStory}`);
          }
          if (section.problem) {
            lines.push(`  Problem: ${section.problem}`);
          }
          if (section.expectedBehavior) {
            lines.push(`  Expected behavior: ${section.expectedBehavior}`);
          }
          if (section.actualBehavior) {
            lines.push(`  Actual behavior: ${section.actualBehavior}`);
          }
          if (section.description) {
            lines.push(`  Description: ${section.description}`);
          }
          if (section.stepsToReproduce) {
            lines.push(`  Steps: ${section.stepsToReproduce}`);
          }
        }
        lines.push("");
      }
      lines.push("Files to inspect first:");
      for (const file of packet.filesToInspect) {
        lines.push(`- ${file}`);
      }
      lines.push("");
      lines.push("Acceptance criteria:");
      for (const item of packet.acceptanceCriteria) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      lines.push("Verification checklist:");
      for (const item of packet.verificationChecklist) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      lines.push("Status suggestions:");
      for (const item of packet.statusSuggestions) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }

  if (result.completionReviewPackets.length > 0) {
    lines.push("## Completion Review Queue");
    lines.push("");
    for (const packet of result.completionReviewPackets) {
      lines.push(`### ${packet.title} (${packet.reviewId})`);
      lines.push("");
      lines.push(`- Report ID: \`${packet.shortId}\``);
      lines.push(`- Area: ${packet.area}`);
      lines.push(`- Type: ${packet.reportTypeLabel}`);
      lines.push(`- Status: ${packet.statusLabel}`);
      lines.push(`- Completion Review: ${packet.completionReviewStatusLabel}`);
      if (packet.forumThreadLink) {
        lines.push(`- Forum thread: ${packet.forumThreadLink}`);
      }
      if (packet.latestUpdateSummary) {
        lines.push(`- Latest update: ${packet.latestUpdateSummary}`);
      }
      lines.push("");
      if (packet.acceptanceCriteria.length > 0) {
        lines.push("Acceptance criteria:");
        for (const criterion of packet.acceptanceCriteria) {
          lines.push(`- ${criterion}`);
        }
        lines.push("");
      }
      lines.push("Completion review checklist:");
      for (const item of packet.reviewChecklist) {
        lines.push(`- ${item}`);
      }
      lines.push("");
    }
  }

  const blockedGroups = [
    ["Approved packets already surfaced first.", []],
    ["Deferred", result.reviewSummary.defer],
    ["Rejected", result.reviewSummary.reject],
    ["Needs Info", result.reviewSummary.needs_info],
  ];

  const hasBlocked = blockedGroups.slice(1).some(([, items]) => items.length > 0);
  if (hasBlocked) {
    lines.push("## Review Summary");
    lines.push("");
    for (const [label, items] of blockedGroups.slice(1)) {
      if (items.length === 0) {
        continue;
      }

      lines.push(`### ${label}`);
      for (const item of items) {
        lines.push(`- ${item.packetId} | ${item.area} | ${item.title}${item.notes ? ` | ${item.notes}` : ""}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function renderCodexPrompts(result) {
  const lines = [
    "# Feedback Reviewed Task Codex Prompts",
    "",
  ];

  const draftOnlyLine = "Draft only \u2014 requires human review before execution.";

  if (result.packets.length === 0) {
    if (result.completionReviewPackets.length === 0) {
      lines.push("No active packets matched the current review filter.");
    }
  }

  if (result.packets.length > 0) {
    for (const packet of result.packets) {
      lines.push(`## ${packet.title} (${packet.packetId})`);
      lines.push("");
      lines.push(draftOnlyLine);
      lines.push("");
      lines.push("Objective");
      lines.push("");
      lines.push(`Address the reviewed ${packet.reportType} packet "${packet.title}" in the ${packet.area} area.`);
      lines.push("");
      lines.push("Context");
      lines.push("");
      lines.push(`- Packet ID: \`${packet.packetId}\``);
      lines.push(`- Feedback report IDs: ${packet.feedbackShortIds.map((id) => `\`${id}\``).join(", ")}`);
      lines.push(`- Reviewer decision: ${packet.reviewerDecision}`);
      lines.push(`- Suggested priority: ${packet.suggestedPriority}`);
      lines.push("");
      lines.push("Feedback evidence");
      lines.push("");
      for (const item of packet.evidenceSummary) {
        lines.push(item.startsWith("- ") ? item : `- ${item}`);
      }
      lines.push("");
      if (packet.cardSections.length > 0) {
        lines.push("Card sections");
        lines.push("");
        for (const section of packet.cardSections) {
          lines.push(`- ${section.shortId} | ${section.headerLabel}`);
          if (section.userStory) {
            lines.push(`  User Story: ${section.userStory}`);
          }
          if (section.problem) {
            lines.push(`  Problem: ${section.problem}`);
          }
          if (section.expectedBehavior) {
            lines.push(`  Expected behavior: ${section.expectedBehavior}`);
          }
          if (section.actualBehavior) {
            lines.push(`  Actual behavior: ${section.actualBehavior}`);
          }
          if (section.description) {
            lines.push(`  Description: ${section.description}`);
          }
          if (section.stepsToReproduce) {
            lines.push(`  Steps: ${section.stepsToReproduce}`);
          }
          if (section.evidenceSummary) {
            lines.push(`  Evidence: ${section.evidenceSummary}`);
          }
        }
        lines.push("");
      }
      lines.push("Implementation plan");
      lines.push("");
      lines.push(packet.implementationHypothesis);
      lines.push("");
      lines.push("Files to inspect first");
      lines.push("");
      for (const file of packet.filesToInspect) {
        lines.push(`- ${file}`);
      }
      lines.push("");
      lines.push("Constraints");
      lines.push("");
      lines.push(`- ${draftOnlyLine}`);
      lines.push("- Do not create automatic GitHub issues.");
      lines.push("- Do not write to ATLAS automatically.");
      lines.push("- Do not mutate Discord or Supabase from the task-packet generator lane.");
      lines.push("- Keep the one-board, reviewed-export workflow intact.");
      lines.push("- Card mutation audit comments stay in the Feedback thread. Do not post to #updates unless the shipped change is user-facing and approved.");
      lines.push("");
      lines.push("Acceptance criteria");
      lines.push("");
      for (const item of packet.acceptanceCriteria) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      lines.push("Verification steps");
      lines.push("");
      for (const item of packet.verificationChecklist) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      lines.push("Documentation updates");
      lines.push("");
      if (packet.docsUpdateNeeded.required && packet.docsUpdateNeeded.suggestedPaths.length > 0) {
        for (const docPath of packet.docsUpdateNeeded.suggestedPaths) {
          lines.push(`- ${docPath}`);
        }
      } else {
        lines.push("- Update docs only if the user-facing workflow or reviewed task contract changes.");
      }
      lines.push("");
    }
  }

  if (result.completionReviewPackets.length > 0) {
    lines.push("## Completion Review Prompts");
    lines.push("");
    for (const packet of result.completionReviewPackets) {
      lines.push(`### ${packet.title} (${packet.reviewId})`);
      lines.push("");
      lines.push(draftOnlyLine);
      lines.push("");
      lines.push("Objective");
      lines.push("");
      lines.push(`Review the completed Fitness ${packet.reportType} card "${packet.title}" before treating it as fully closed.`);
      lines.push("");
      lines.push("Context");
      lines.push("");
      lines.push(`- Report ID: \`${packet.shortId}\``);
      lines.push(`- Current status: ${packet.statusLabel}`);
      lines.push(`- Completion Review: ${packet.completionReviewStatusLabel}`);
      if (packet.forumThreadLink) {
        lines.push(`- Forum thread: ${packet.forumThreadLink}`);
      }
      if (packet.latestUpdateSummary) {
        lines.push(`- Latest update: ${packet.latestUpdateSummary}`);
      }
      lines.push("");
      lines.push("Completion review checklist");
      lines.push("");
      for (const item of packet.reviewChecklist) {
        lines.push(`- ${item}`);
      }
      lines.push("");
      if (packet.acceptanceCriteria.length > 0) {
        lines.push("Acceptance criteria to re-check");
        lines.push("");
        for (const item of packet.acceptanceCriteria) {
          lines.push(`- ${item}`);
        }
        lines.push("");
      }
      lines.push("Constraints");
      lines.push("");
      lines.push(`- ${draftOnlyLine}`);
      lines.push("- This is a review packet, not a new implementation prompt.");
      lines.push("- Do not post to #updates for completion-review state changes.");
      lines.push("- Leave audit history in the feedback thread.");
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export function buildTaskPacketResult({
  records,
  inputCount = records.length,
  args,
  sourcePath,
  decisionMap = new Map(),
}) {
  const implementationRecords = records.filter((record) => isActiveImplementationStatus(record));
  const completionReviewPackets = args.includeCompletedReview
    ? records.filter((record) => isPendingCompletionReview(record)).map((record) => buildCompletionReviewPacket(record))
    : [];
  const grouped = groupRecordsIntoPackets(implementationRecords)
    .map((packet) => finalizePacket(packet, args, decisionMap));
  const ordered = sortPacketsForReview(grouped);

  return {
    generatedAt: new Date().toISOString(),
    sourcePath,
    filters: {
      types: [...args.types],
      statuses: [...args.statuses],
      area: args.area,
      limit: args.limit,
      codexPrompts: args.codexPrompts,
      includeCompletedReview: args.includeCompletedReview,
      debug: args.debug,
      decisionsPath: args.decisions,
    },
    summary: {
      inputCards: inputCount,
      includedCards: records.length,
      implementationCards: implementationRecords.length,
      completionReviewCards: completionReviewPackets.length,
      activePackets: ordered.active.length,
      completionReviewPackets: completionReviewPackets.length,
      approvedPackets: ordered.active.filter((packet) => packet.reviewerDecision === "approve").length,
      deferredPackets: ordered.summary.defer.length,
      rejectedPackets: ordered.summary.reject.length,
      needsInfoPackets: ordered.summary.needs_info.length,
    },
    packets: ordered.active,
    completionReviewPackets,
    reviewSummary: ordered.summary,
  };
}

export async function generateFeedbackTaskPackets({
  args = parseArgs(),
} = {}) {
  const loadedRecords = loadBoardRecords(args.from);
  const records = filterBoardRecords(loadedRecords, args);
  const decisionMap = loadReviewDecisions(args.decisions);
  const result = buildTaskPacketResult({
    records,
    inputCount: loadedRecords.length,
    args,
    sourcePath: args.from,
    decisionMap,
  });
  const outputPaths = resolveOutputPaths(args);

  ensureDir(outputPaths.markdown);
  fs.writeFileSync(outputPaths.markdown, renderPacketMarkdown(result), "utf8");

  ensureDir(outputPaths.json);
  fs.writeFileSync(outputPaths.json, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  ensureDir(outputPaths.decisionsExample);
  fs.writeFileSync(
    outputPaths.decisionsExample,
    `${JSON.stringify(buildReviewDecisionsExample(result.packets[0]?.packetId), null, 2)}\n`,
    "utf8",
  );

  if (outputPaths.prompts) {
    ensureDir(outputPaths.prompts);
    fs.writeFileSync(outputPaths.prompts, renderCodexPrompts(result), "utf8");
  }

  console.log(
    `Generated ${result.packets.length} active feedback task packet${result.packets.length === 1 ? "" : "s"} and ${result.completionReviewPackets.length} completion review packet${result.completionReviewPackets.length === 1 ? "" : "s"} from ${records.length} board card${records.length === 1 ? "" : "s"}.`,
  );
  console.log(`- markdown: ${outputPaths.markdown}`);
  console.log(`- json: ${outputPaths.json}`);
  console.log(`- review decisions example: ${outputPaths.decisionsExample}`);
  if (outputPaths.prompts) {
    console.log(`- codex prompts: ${outputPaths.prompts}`);
  }

  return {
    result,
    outputPaths,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  generateFeedbackTaskPackets().catch((error) => {
    console.error(`generate-feedback-task-packets failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
