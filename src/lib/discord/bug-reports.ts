import "server-only";

import { createHash } from "node:crypto";
import { buildDiscordFeedbackEmojiPrefix } from "@/lib/discord/feedback-emojis";
import { createDiscordThreadMessage } from "@/lib/discord/rest";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DiscordAllowedMentions } from "@/lib/discord/rest";

export const DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH = 120;
export const DISCORD_BUG_REPORT_AREA_MAX_LENGTH = 80;
export const DISCORD_BUG_REPORT_SEVERITY_MAX_LENGTH = 20;
export const DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH = 1200;
export const DISCORD_BUG_REPORT_STEPS_MAX_LENGTH = 1200;
export const DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH = 500;
export const DISCORD_BUG_REPORT_FORUM_TITLE_MAX_LENGTH = 100;
export const DISCORD_BUG_REPORT_FORUM_BODY_MAX_LENGTH = 2000;
export const DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH = 1000;
export const DISCORD_FEEDBACK_COMPLETION_REVIEW_NOTE_MAX_LENGTH = 1000;
export const DISCORD_FEEDBACK_AUDIT_NOTE_MAX_LENGTH = 240;
export const DISCORD_FEEDBACK_ATTACHMENT_MAX_COUNT = 3;
export const DISCORD_FEEDBACK_ATTACHMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024;
export const DISCORD_BUG_REPORT_SHORT_ID_MIN_LENGTH = 6;
export const DISCORD_BUG_REPORT_RATE_LIMIT_WINDOW_MINUTES = 10;
export const DISCORD_BUG_REPORT_RATE_LIMIT_MAX_REPORTS = 3;
export const DISCORD_BUG_REPORT_DUPLICATE_WINDOW_DAYS = 30;
export const DISCORD_BUG_REPORT_DUPLICATE_ACTIVE_STATUSES = ["new", "needs_info", "confirmed", "in_progress"] as const;
export const DISCORD_BUG_REPORT_TYPE_TAG_LABELS = {
  bug: "Bug",
  feature: "Feature",
  fix: "Fix",
} as const;
export const DISCORD_BUG_REPORT_STATUS_TAG_LABELS = {
  new: "New",
  needs_info: "Needs Info",
  confirmed: "Confirmed",
  fawxzzy_review: "Ready for Fawxzzy Review",
  in_progress: "In Progress",
  fixed: "Fixed",
  closed: "Closed",
  duplicate: "Duplicate",
  spam: "Spam",
  withdrawn: "Withdrawn",
} as const;
export const DISCORD_FEEDBACK_BACKLOG_TAG_LABEL = "Backlog";
export const DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS = {
  not_required: "Not Required",
  pending: "Pending",
  approved: "Approved",
  needs_followup: "Needs Follow-Up",
} as const;
export const DISCORD_FEEDBACK_EFFORT_POINT_VALUES = [1, 2, 3, 5, 8, 13, 21, 34, 55] as const;

export type DiscordBugReportSeverity = "low" | "medium" | "high" | "blocker";
export type DiscordBugReportStatus = keyof typeof DISCORD_BUG_REPORT_STATUS_TAG_LABELS;
export type DiscordBugReportReportType = keyof typeof DISCORD_BUG_REPORT_TYPE_TAG_LABELS;
export type DiscordBugReportReporterUserKind = "human" | "automation" | "unknown";
export type DiscordFeedbackCompletionReviewStatus = keyof typeof DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS;
export type DiscordFeedbackEffortPoints = typeof DISCORD_FEEDBACK_EFFORT_POINT_VALUES[number];

export type DiscordBugReportModalFields = {
  summary: string | null;
  area: string | null;
  details: string | null;
};

export type DiscordFeedbackAttachmentMetadata = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url: string | null;
  proxyUrl: string | null;
};

export type DiscordBugReportStatusUpdate = {
  reportIdOrPrefix: string;
  status: DiscordBugReportStatus;
  note: string | null;
  updatedByDiscordUserId: string;
  updatedAt?: Date;
};

export type DiscordFeedbackCardAuditAction =
  | "status_update"
  | "completion_review"
  | "withdraw"
  | "reporter_update"
  | "staff_update"
  | "duplicate_signal"
  | "sync_format";

export type DiscordBugReporterLink = {
  fitnessUserId: string | null;
  memberNumber: number | null;
  userKind: DiscordBugReportReporterUserKind | null;
};

export type DiscordBugReportRow = {
  id: string;
  source: "discord";
  report_type: DiscordBugReportReportType;
  status: DiscordBugReportStatus;
  severity: DiscordBugReportSeverity;
  effort_points: DiscordFeedbackEffortPoints;
  area: string | null;
  summary: string;
  details: string | null;
  steps_to_reproduce: string | null;
  screenshot_url: string | null;
  attachment_count: number;
  attachment_metadata: DiscordFeedbackAttachmentMetadata[] | null;
  attachment_pruned: boolean;
  reporter_discord_user_id: string;
  reporter_discord_username: string | null;
  reporter_fitness_user_id: string | null;
  reporter_member_number: number | null;
  reporter_user_kind: DiscordBugReportReporterUserKind | null;
  discord_interaction_id: string | null;
  duplicate_fingerprint: string | null;
  duplicate_count: number;
  first_seen_at: string;
  last_seen_at: string;
  discord_forum_channel_id: string | null;
  discord_forum_thread_id: string | null;
  discord_forum_message_id: string | null;
  discord_forum_applied_tag_ids: string[] | null;
  discord_forum_title: string | null;
  staff_channel_message_id: string | null;
  closed_at: string | null;
  pruned_at: string | null;
  details_pruned: boolean;
  triage_notes: string | null;
  status_updated_at: string | null;
  status_updated_by_discord_user_id: string | null;
  status_note: string | null;
  completion_review_status: DiscordFeedbackCompletionReviewStatus;
  completion_reviewed_at: string | null;
  completion_reviewed_by_discord_user_id: string | null;
  completion_review_note: string | null;
  reporter_mentioned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DiscordFeedbackCompletionReviewUpdate = {
  reportId: string;
  completionReviewStatus: DiscordFeedbackCompletionReviewStatus;
  reviewedByDiscordUserId: string;
  note: string | null;
  reviewedAt?: Date;
  adminClient?: DiscordBugReportsAdminClient;
};

export type DiscordFeedbackCardEvidence = {
  kind: "screenshot" | "attachment" | "note";
  label: string;
  value: string;
};

export type DiscordFeedbackCardSections = {
  reportType: DiscordBugReportReportType;
  headerLabel: string;
  title: string;
  problem: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  stepsToReproduce: string | null;
  userStory: string | null;
  description: string | null;
  acceptanceCriteria: string[];
  evidence: DiscordFeedbackCardEvidence[];
};

export type DiscordFeedbackReportSelectCandidate = Pick<
  DiscordBugReportRow,
  "id" | "report_type" | "status" | "area" | "summary" | "updated_at"
>;

type DiscordBugReportsAdminClient = {
  from: (table: "discord_feedback_reports" | "discord_member_links") => any;
};

type NormalizedDiscordBugReportInput = {
  reportType: DiscordBugReportReportType;
  area: string | null;
  severity: DiscordBugReportSeverity;
  summary: string;
  details: string;
  stepsToReproduce: string | null;
  screenshotUrl: string | null;
  duplicateFingerprint: string;
  duplicateAreaKey: string;
  duplicateSummaryKey: string;
  duplicateDetailKey: string;
  duplicateSummaryTokens: string[];
  duplicateDetailTokens: string[];
  duplicateCombinedTokens: string[];
};

const DISCORD_BUG_REPORT_DUPLICATE_CANDIDATE_LIMIT = 25;
const DUPLICATE_TOKEN_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "before",
  "but",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "for",
  "from",
  "had",
  "has",
  "have",
  "here",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "my",
  "not",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "their",
  "then",
  "there",
  "this",
  "to",
  "was",
  "were",
  "when",
  "with",
]);

const DUPLICATE_TOKEN_SYNONYMS: Record<string, string> = {
  broken: "fail",
  broke: "fail",
  cannot: "fail",
  cant: "fail",
  couldnt: "fail",
  didnt: "fail",
  doesnt: "fail",
  failing: "fail",
  failed: "fail",
  fails: "fail",
  failure: "fail",
  wont: "fail",
  unable: "fail",
};

const FEATURE_FORUM_DESCRIPTION_PLACEHOLDER = "__FEATURE_DESCRIPTION__";

const DISCORD_FEEDBACK_COMPLEXITY_SIGNAL = /\b(auth|account|verification|verify|discord|forum|thread|role|permission|release|deploy|preview|brand|favicon|manifest|pwa|sync|worker|automation|queue|supabase|migration|database|import|export|mirror|payment|subscription|mobile|ios|android)\b/i;
const DISCORD_FEEDBACK_BROAD_SCOPE_SIGNAL = /\b(all|every|across|multiple|entire|global|systemwide|system-wide|whole app|whole flow|end to end|end-to-end)\b/i;

const DISCORD_BUG_REPORT_SELECT_COLUMNS = [
  "id",
  "source",
  "report_type",
  "status",
  "severity",
  "effort_points",
  "area",
  "summary",
  "details",
  "steps_to_reproduce",
  "screenshot_url",
  "attachment_count",
  "attachment_metadata",
  "attachment_pruned",
  "reporter_discord_user_id",
  "reporter_discord_username",
  "reporter_fitness_user_id",
  "reporter_member_number",
  "reporter_user_kind",
  "discord_interaction_id",
  "duplicate_fingerprint",
  "duplicate_count",
  "first_seen_at",
  "last_seen_at",
  "discord_forum_channel_id",
  "discord_forum_thread_id",
  "discord_forum_message_id",
  "discord_forum_applied_tag_ids",
  "discord_forum_title",
  "staff_channel_message_id",
  "closed_at",
  "pruned_at",
  "details_pruned",
  "triage_notes",
  "status_updated_at",
  "status_updated_by_discord_user_id",
  "status_note",
  "completion_review_status",
  "completion_reviewed_at",
  "completion_reviewed_by_discord_user_id",
  "completion_review_note",
  "reporter_mentioned_at",
  "created_at",
  "updated_at",
].join(", ");

function normalizeTextInput(value: string | null | undefined, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function stemDuplicateToken(token: string): string {
  if (token.length > 5 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.length > 5 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }

  if (token.length > 4 && token.endsWith("ed")) {
    return token.slice(0, -2);
  }

  if (token.length > 4 && token.endsWith("es")) {
    return token.slice(0, -2);
  }

  if (token.length > 3 && token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

function normalizeDuplicateToken(value: string): string | null {
  const compact = value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  if (!compact) {
    return null;
  }

  let normalized = DUPLICATE_TOKEN_SYNONYMS[compact] ?? compact;
  normalized = stemDuplicateToken(normalized);
  normalized = DUPLICATE_TOKEN_SYNONYMS[normalized] ?? normalized;

  if (!normalized || normalized.length < 2 || DUPLICATE_TOKEN_STOPWORDS.has(normalized)) {
    return null;
  }

  return normalized;
}

function tokenizeDuplicateText(value: string | null | undefined, maxTokens = 12): string[] {
  if (!value) {
    return [];
  }

  const normalized = normalizeTextInput(value, Math.max(DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH));
  if (!normalized) {
    return [];
  }

  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const rawToken of normalized.split(/[^a-zA-Z0-9']+/)) {
    const token = normalizeDuplicateToken(rawToken);
    if (!token || seen.has(token)) {
      continue;
    }

    seen.add(token);
    tokens.push(token);
    if (tokens.length >= maxTokens) {
      break;
    }
  }

  return tokens;
}

function buildDuplicateTextKey(tokens: string[]): string {
  return tokens.join(" ");
}

function countSharedDuplicateTokens(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  return left.reduce((count, token) => count + (rightSet.has(token) ? 1 : 0), 0);
}

function computeDuplicateTokenCoverage(left: string[], right: string[]): number {
  const shared = countSharedDuplicateTokens(left, right);
  const denominator = Math.min(left.length, right.length);
  return denominator > 0 ? shared / denominator : 0;
}

function areDuplicateAreasComparable(leftAreaKey: string, rightAreaKey: string): boolean {
  return !leftAreaKey || !rightAreaKey || leftAreaKey === rightAreaKey;
}

function buildDuplicateSignal(args: {
  reportType: DiscordBugReportReportType;
  area: string | null;
  summary: string;
  details: string | null;
}): {
  reportType: DiscordBugReportReportType;
  areaKey: string;
  summaryKey: string;
  detailKey: string;
  summaryTokens: string[];
  detailTokens: string[];
  combinedTokens: string[];
  fingerprint: string;
} {
  const areaTokens = tokenizeDuplicateText(args.area, 6);
  const summaryTokens = tokenizeDuplicateText(args.summary, 12);
  const detailTokens = tokenizeDuplicateText(args.details, 12);
  const areaKey = buildDuplicateTextKey(areaTokens);
  const summaryKey = buildDuplicateTextKey(summaryTokens);
  const detailKey = buildDuplicateTextKey(detailTokens);
  const combinedTokens = uniqueStrings([...summaryTokens, ...detailTokens]).slice(0, 16);

  return {
    reportType: args.reportType,
    areaKey,
    summaryKey,
    detailKey,
    summaryTokens,
    detailTokens,
    combinedTokens,
    fingerprint: createHash("sha256")
      .update(`${args.reportType}::${areaKey}::${summaryKey}`)
      .digest("hex"),
  };
}

function scoreDuplicateCandidate(args: {
  candidate: DiscordBugReportRow;
  normalizedInput: NormalizedDiscordBugReportInput;
}): number {
  if (args.candidate.report_type !== args.normalizedInput.reportType) {
    return 0;
  }

  const candidateSignal = buildDuplicateSignal({
    reportType: args.candidate.report_type,
    area: args.candidate.area,
    summary: args.candidate.summary,
    details: args.candidate.details,
  });

  if (
    args.candidate.duplicate_fingerprint === args.normalizedInput.duplicateFingerprint
    || candidateSignal.fingerprint === args.normalizedInput.duplicateFingerprint
  ) {
    return 100;
  }

  const areaComparable = areDuplicateAreasComparable(
    args.normalizedInput.duplicateAreaKey,
    candidateSignal.areaKey,
  );
  const summaryCoverage = computeDuplicateTokenCoverage(
    args.normalizedInput.duplicateSummaryTokens,
    candidateSignal.summaryTokens,
  );
  const detailCoverage = computeDuplicateTokenCoverage(
    args.normalizedInput.duplicateDetailTokens,
    candidateSignal.detailTokens,
  );
  const combinedCoverage = computeDuplicateTokenCoverage(
    args.normalizedInput.duplicateCombinedTokens,
    candidateSignal.combinedTokens,
  );
  const sharedSummaryTokens = countSharedDuplicateTokens(
    args.normalizedInput.duplicateSummaryTokens,
    candidateSignal.summaryTokens,
  );

  if (
    args.normalizedInput.duplicateSummaryKey
    && args.normalizedInput.duplicateSummaryKey === candidateSignal.summaryKey
    && areaComparable
  ) {
    return 95;
  }

  if (areaComparable && sharedSummaryTokens >= 2 && summaryCoverage >= 0.75) {
    return 85;
  }

  if (areaComparable && sharedSummaryTokens >= 2 && summaryCoverage >= 0.5 && detailCoverage >= 0.5) {
    return 75;
  }

  if (areaComparable && sharedSummaryTokens >= 3 && combinedCoverage >= 0.7) {
    return 70;
  }

  return 0;
}

function neutralizeDiscordMentions(value: string): string {
  return value
    .replace(/@everyone/gi, "@\u200beveryone")
    .replace(/@here/gi, "@\u200bhere")
    .replace(/<@&/g, "<@\u200b&")
    .replace(/<@/g, "<@\u200b");
}

function summarizeDiscordAuditText(value: string | null | undefined): string | null {
  const normalized = normalizeTextInput(value, DISCORD_FEEDBACK_AUDIT_NOTE_MAX_LENGTH);
  if (!normalized) {
    return null;
  }

  return neutralizeDiscordMentions(normalized.replace(/\s+/g, " "));
}

function isDiscordSnowflake(value: string): boolean {
  return /^[0-9]{1,32}$/.test(value);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isShortReportIdPrefix(value: string): boolean {
  return new RegExp(`^[0-9a-f]{${DISCORD_BUG_REPORT_SHORT_ID_MIN_LENGTH},32}$`, "i").test(value);
}

function formatUuidHex(hex: string): string {
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function buildUuidBoundsFromPrefix(prefix: string): { lower: string; upper: string } | null {
  const normalized = prefix.trim().toLowerCase();
  if (!/^[0-9a-f]{6,32}$/.test(normalized)) {
    return null;
  }

  const lowerHex = normalized.padEnd(32, "0").slice(0, 32);
  const upperHex = normalized.padEnd(32, "f").slice(0, 32);

  return {
    lower: formatUuidHex(lowerHex),
    upper: formatUuidHex(upperHex),
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function coerceAttachmentMetadataEntry(value: unknown): DiscordFeedbackAttachmentMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string"
    || typeof candidate.filename !== "string"
    || typeof candidate.contentType !== "string"
    || typeof candidate.size !== "number"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    filename: candidate.filename,
    contentType: candidate.contentType,
    size: candidate.size,
    url: typeof candidate.url === "string" ? candidate.url : null,
    proxyUrl: typeof candidate.proxyUrl === "string" ? candidate.proxyUrl : null,
  };
}

function compareDiscordSnowflakesDescending(left: string, right: string): number {
  if (left.length !== right.length) {
    return right.length - left.length;
  }

  const leftValue = BigInt(left);
  const rightValue = BigInt(right);
  if (leftValue === rightValue) {
    return 0;
  }

  return leftValue > rightValue ? -1 : 1;
}

function extractDiscordForumThreadLookupCandidates(value: string): string[] {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return [];
  }

  if (isDiscordSnowflake(normalized)) {
    return [normalized];
  }

  let urlSnowflakes: string[] = [];

  try {
    const parsedUrl = new URL(normalized);
    urlSnowflakes = Array.from(parsedUrl.pathname.matchAll(/\d{5,32}/g), (match) => match[0] ?? "");
  } catch {
    urlSnowflakes = [];
  }

  if (urlSnowflakes.length === 0) {
    return [];
  }

  const prioritized: string[] = [];
  if (urlSnowflakes.length >= 2) {
    prioritized.push(urlSnowflakes[urlSnowflakes.length - 2] ?? "");
  }

  const largestSnowflake = [...urlSnowflakes].sort(compareDiscordSnowflakesDescending)[0] ?? "";
  if (largestSnowflake) {
    prioritized.push(largestSnowflake);
  }

  return uniqueStrings([...prioritized, ...urlSnowflakes]);
}

function coerceUserKind(value: unknown): DiscordBugReportReporterUserKind | null {
  return value === "human" || value === "automation" || value === "unknown" ? value : null;
}

function coerceBugReportStatus(value: unknown): DiscordBugReportStatus | null {
  return typeof value === "string" && value in DISCORD_BUG_REPORT_STATUS_TAG_LABELS
    ? value as DiscordBugReportStatus
    : null;
}

function coerceCompletionReviewStatus(value: unknown): DiscordFeedbackCompletionReviewStatus | null {
  return typeof value === "string" && value in DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS
    ? value as DiscordFeedbackCompletionReviewStatus
    : null;
}

function coerceBugReportReportType(value: unknown): DiscordBugReportReportType | null {
  if (value === "feat") {
    return "feature";
  }

  return typeof value === "string" && value in DISCORD_BUG_REPORT_TYPE_TAG_LABELS
    ? value as DiscordBugReportReportType
    : null;
}

function coerceBugReportSeverity(value: unknown): DiscordBugReportSeverity | null {
  return value === "low" || value === "medium" || value === "high" || value === "blocker"
    ? value
    : null;
}

export function normalizeDiscordFeedbackEffortPoints(value: unknown): DiscordFeedbackEffortPoints | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  return DISCORD_FEEDBACK_EFFORT_POINT_VALUES.includes(value as DiscordFeedbackEffortPoints)
    ? value as DiscordFeedbackEffortPoints
    : null;
}

function snapDiscordFeedbackEffortPoints(value: number): DiscordFeedbackEffortPoints {
  for (const points of DISCORD_FEEDBACK_EFFORT_POINT_VALUES) {
    if (value <= points) {
      return points;
    }
  }

  return DISCORD_FEEDBACK_EFFORT_POINT_VALUES[DISCORD_FEEDBACK_EFFORT_POINT_VALUES.length - 1];
}

export function estimateDiscordFeedbackEffortPoints(report: Pick<
  DiscordBugReportRow,
  "report_type" | "severity" | "area" | "summary" | "details" | "steps_to_reproduce" | "attachment_count" | "duplicate_count"
>): DiscordFeedbackEffortPoints {
  let complexityScore = report.report_type === "feature" ? 2 : 1;
  const detailsLength = String(report.details ?? "").trim().length;
  const stepsLength = String(report.steps_to_reproduce ?? "").trim().length;
  const duplicateCount = Math.max(1, Number(report.duplicate_count ?? 1));
  const attachmentCount = Math.max(0, Number(report.attachment_count ?? 0));
  const combinedText = [
    report.area ?? "",
    report.summary ?? "",
    report.details ?? "",
    report.steps_to_reproduce ?? "",
  ].join(" ");

  if (report.report_type !== "feature") {
    switch (report.severity) {
      case "medium":
        complexityScore += 1;
        break;
      case "high":
        complexityScore += 2;
        break;
      case "blocker":
        complexityScore += 4;
        break;
      default:
        break;
    }
  } else if (/\b(add|support|allow|create|new|share|export|import|sync)\b/i.test(combinedText)) {
    complexityScore += 1;
  }

  if (detailsLength > 180) {
    complexityScore += 1;
  }
  if (detailsLength > 480) {
    complexityScore += 1;
  }
  if (stepsLength > 140) {
    complexityScore += 1;
  }
  if (attachmentCount > 0) {
    complexityScore += 1;
  }
  if (duplicateCount >= 2) {
    complexityScore += 1;
  }
  if (duplicateCount >= 5) {
    complexityScore += 1;
  }
  if (DISCORD_FEEDBACK_COMPLEXITY_SIGNAL.test(combinedText)) {
    complexityScore += 2;
  }
  if (DISCORD_FEEDBACK_BROAD_SCOPE_SIGNAL.test(combinedText)) {
    complexityScore += 2;
  }

  return snapDiscordFeedbackEffortPoints(Math.max(report.report_type === "feature" ? 2 : 1, complexityScore));
}

function coerceBugReportRow(data: Record<string, unknown> | null | undefined): DiscordBugReportRow | null {
  if (!data || typeof data.id !== "string") {
    return null;
  }

  const reportType = coerceBugReportReportType(data.report_type);
  const status = coerceBugReportStatus(data.status);
  const severity = coerceBugReportSeverity(data.severity);
  const effortPoints = normalizeDiscordFeedbackEffortPoints(data.effort_points);
  const completionReviewStatus = coerceCompletionReviewStatus(data.completion_review_status) ?? "not_required";
  if (!reportType || !status || !severity || typeof data.summary !== "string" || typeof data.reporter_discord_user_id !== "string") {
    return null;
  }

  return {
    id: data.id,
    source: "discord",
    report_type: reportType,
    status,
    severity,
    effort_points: effortPoints ?? estimateDiscordFeedbackEffortPoints({
      report_type: reportType,
      severity,
      area: typeof data.area === "string" ? data.area : null,
      summary: data.summary,
      details: typeof data.details === "string" ? data.details : null,
      steps_to_reproduce: typeof data.steps_to_reproduce === "string" ? data.steps_to_reproduce : null,
      attachment_count: typeof data.attachment_count === "number" ? data.attachment_count : 0,
      duplicate_count: typeof data.duplicate_count === "number" ? data.duplicate_count : 1,
    }),
    area: typeof data.area === "string" ? data.area : null,
    summary: data.summary,
    details: typeof data.details === "string" ? data.details : null,
    steps_to_reproduce: typeof data.steps_to_reproduce === "string" ? data.steps_to_reproduce : null,
    screenshot_url: typeof data.screenshot_url === "string" ? data.screenshot_url : null,
    attachment_count: typeof data.attachment_count === "number" ? data.attachment_count : 0,
    attachment_metadata: Array.isArray(data.attachment_metadata)
      ? data.attachment_metadata.map((entry) => coerceAttachmentMetadataEntry(entry)).filter((entry): entry is DiscordFeedbackAttachmentMetadata => Boolean(entry))
      : null,
    attachment_pruned: Boolean(data.attachment_pruned),
    reporter_discord_user_id: data.reporter_discord_user_id,
    reporter_discord_username: typeof data.reporter_discord_username === "string" ? data.reporter_discord_username : null,
    reporter_fitness_user_id: typeof data.reporter_fitness_user_id === "string" ? data.reporter_fitness_user_id : null,
    reporter_member_number: typeof data.reporter_member_number === "number" ? data.reporter_member_number : null,
    reporter_user_kind: coerceUserKind(data.reporter_user_kind),
    discord_interaction_id: typeof data.discord_interaction_id === "string" ? data.discord_interaction_id : null,
    duplicate_fingerprint: typeof data.duplicate_fingerprint === "string" ? data.duplicate_fingerprint : null,
    duplicate_count: typeof data.duplicate_count === "number" ? data.duplicate_count : 1,
    first_seen_at: typeof data.first_seen_at === "string" ? data.first_seen_at : new Date(0).toISOString(),
    last_seen_at: typeof data.last_seen_at === "string" ? data.last_seen_at : new Date(0).toISOString(),
    discord_forum_channel_id: typeof data.discord_forum_channel_id === "string" ? data.discord_forum_channel_id : null,
    discord_forum_thread_id: typeof data.discord_forum_thread_id === "string" ? data.discord_forum_thread_id : null,
    discord_forum_message_id: typeof data.discord_forum_message_id === "string" ? data.discord_forum_message_id : null,
    discord_forum_applied_tag_ids: Array.isArray(data.discord_forum_applied_tag_ids)
      ? data.discord_forum_applied_tag_ids.filter((value): value is string => typeof value === "string")
      : null,
    discord_forum_title: typeof data.discord_forum_title === "string" ? data.discord_forum_title : null,
    staff_channel_message_id: typeof data.staff_channel_message_id === "string" ? data.staff_channel_message_id : null,
    closed_at: typeof data.closed_at === "string" ? data.closed_at : null,
    pruned_at: typeof data.pruned_at === "string" ? data.pruned_at : null,
    details_pruned: Boolean(data.details_pruned),
    triage_notes: typeof data.triage_notes === "string" ? data.triage_notes : null,
    status_updated_at: typeof data.status_updated_at === "string" ? data.status_updated_at : null,
    status_updated_by_discord_user_id: typeof data.status_updated_by_discord_user_id === "string" ? data.status_updated_by_discord_user_id : null,
    status_note: typeof data.status_note === "string" ? data.status_note : null,
    completion_review_status: completionReviewStatus,
    completion_reviewed_at: typeof data.completion_reviewed_at === "string" ? data.completion_reviewed_at : null,
    completion_reviewed_by_discord_user_id: typeof data.completion_reviewed_by_discord_user_id === "string" ? data.completion_reviewed_by_discord_user_id : null,
    completion_review_note: typeof data.completion_review_note === "string" ? data.completion_review_note : null,
    reporter_mentioned_at: typeof data.reporter_mentioned_at === "string" ? data.reporter_mentioned_at : null,
    created_at: typeof data.created_at === "string" ? data.created_at : new Date(0).toISOString(),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date(0).toISOString(),
  };
}

export function normalizeDiscordCompletionReviewStatus(
  value: string | null | undefined,
): DiscordFeedbackCompletionReviewStatus | null {
  const normalized = normalizeTextInput(value, 40)?.toLowerCase() ?? "";
  return normalized in DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS
    ? normalized as DiscordFeedbackCompletionReviewStatus
    : null;
}

export function formatDiscordCompletionReviewStatusLabel(
  value: DiscordFeedbackCompletionReviewStatus | null | undefined,
): string {
  if (!value) {
    return DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS.not_required;
  }

  return DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS[value] ?? DISCORD_FEEDBACK_COMPLETION_REVIEW_STATUS_TAG_LABELS.not_required;
}

function getDiscordFeedbackTestingForumChannelId(): string | null {
  const value = process.env.DISCORD_FEEDBACK_TESTING_FORUM_CHANNEL_ID?.trim();
  return value && isDiscordSnowflake(value) ? value : null;
}

export function isDiscordFeedbackTestingCard(
  report: Pick<DiscordBugReportRow, "discord_forum_channel_id" | "area" | "summary" | "details">,
): boolean {
  const testingForumChannelId = getDiscordFeedbackTestingForumChannelId();
  if (testingForumChannelId && report.discord_forum_channel_id === testingForumChannelId) {
    return true;
  }

  const area = String(report.area ?? "").trim().toLowerCase();
  const summary = String(report.summary ?? "").trim().toLowerCase();
  const details = String(report.details ?? "").trim().toLowerCase();
  const combined = `${area} ${summary} ${details}`;

  if (area === "discord feedback qa" || area === "feedback testing") {
    return true;
  }

  return combined.includes("feedback canary") || combined.includes("canonical discord feedback canary");
}

export function requiresDiscordFeedbackCompletionReview(
  report: Pick<DiscordBugReportRow, "discord_forum_channel_id" | "area" | "summary" | "details">,
): boolean {
  return !isDiscordFeedbackTestingCard(report);
}

function buildDuplicateLookupCutoff(now: Date): string {
  return new Date(now.getTime() - DISCORD_BUG_REPORT_DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function formatTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function formatForumAreaLabel(area: string | null): string {
  const normalizedArea = normalizeTextInput(area, DISCORD_BUG_REPORT_AREA_MAX_LENGTH);
  return normalizedArea ? formatTitleCase(normalizedArea) : "General";
}

function formatForumSummary(summary: string): string {
  return normalizeTextInput(summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH)?.replace(/\s+/g, " ") ?? "Untitled bug";
}

function formatForumSeverityLabel(severity: DiscordBugReportSeverity): string {
  return formatTitleCase(severity);
}

function buildGenericBugExpectedBehavior(report: DiscordBugReportRow): string {
  const areaLabel = formatForumAreaLabel(report.area);
  return `The ${areaLabel} flow should complete without the reported issue and give the user a clear result.`;
}

function buildGenericFeatureUserStory(report: DiscordBugReportRow): string {
  const summary = formatForumSummary(report.summary);
  const areaLabel = formatForumAreaLabel(report.area);
  return `As a user, I want ${summary}, so that the ${areaLabel} flow better matches the requested outcome.`;
}

function normalizeForumBodySectionValue(value: string | null | undefined): string | null {
  return normalizeTextInput(value, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);
}

function normalizeCriteriaLine(value: string): string | null {
  const normalized = value
    .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function parseFeatureAcceptanceCriteriaOverride(value: string | null | undefined): string[] {
  const normalized = normalizeTextInput(value, DISCORD_BUG_REPORT_STEPS_MAX_LENGTH);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\r?\n/)
    .map((line) => normalizeCriteriaLine(line))
    .filter((line): line is string => Boolean(line))
    .slice(0, 10);
}

export function buildBugAcceptanceCriteria(report: Pick<
  DiscordBugReportRow,
  "area" | "summary"
>): string[] {
  const areaLabel = formatForumAreaLabel(report.area);

  return [
    "The reported issue is reproduced or clearly explained.",
    `The ${areaLabel} flow behaves as expected after the fix.`,
    "The user sees a clear result instead of a misleading failure message.",
    "The feedback card is updated when the issue is resolved.",
  ];
}

export function buildFeatureAcceptanceCriteria(report: Pick<
  DiscordBugReportRow,
  "area" | "summary" | "steps_to_reproduce"
>): string[] {
  const overrideCriteria = parseFeatureAcceptanceCriteriaOverride(report.steps_to_reproduce);
  if (overrideCriteria.length > 0) {
    return overrideCriteria;
  }

  const areaLabel = formatForumAreaLabel(report.area);

  return [
    "The requested capability is available to the intended user.",
    `The ${areaLabel} flow makes the requested outcome clear to users.`,
    "Operator or user-facing behavior changes are documented when needed.",
    "The feedback card is updated when the feature is completed.",
  ];
}

export function buildDiscordFeedbackEvidence(report: Pick<
  DiscordBugReportRow,
  "screenshot_url" | "attachment_pruned" | "attachment_metadata"
>): DiscordFeedbackCardEvidence[] {
  const evidence: DiscordFeedbackCardEvidence[] = [];
  const screenshotUrl = normalizeForumBodySectionValue(report.screenshot_url);
  if (screenshotUrl) {
    evidence.push({
      kind: "screenshot",
      label: "Screenshot",
      value: truncateForumDisplayValue(screenshotUrl, 300),
    });
  }

  const attachments = Array.isArray(report.attachment_metadata)
    ? report.attachment_metadata.slice(0, DISCORD_FEEDBACK_ATTACHMENT_MAX_COUNT)
    : [];
  for (const attachment of attachments) {
    evidence.push({
      kind: "attachment",
      label: "Attachment",
      value: renderAttachmentLine(attachment),
    });
  }

  if (evidence.length === 0) {
    evidence.push({
      kind: "note",
      label: "Evidence",
      value: "Not provided",
    });
  }

  return evidence;
}

export function buildDiscordFeedbackCardSections(report: DiscordBugReportRow): DiscordFeedbackCardSections {
  const title = renderForumBodyValue(report.summary, "Not provided");
  const details = report.report_type === "feature"
    ? normalizeForumBodySectionValue(report.details)
    : renderForumBodyDisplayValue({
      value: report.details,
      fallback: "Not provided",
      maxLength: 420,
    });
  const steps = renderForumBodyDisplayValue({
    value: report.steps_to_reproduce,
    fallback: "Not provided",
    maxLength: 240,
  });
  const evidence = buildDiscordFeedbackEvidence(report);

  if (report.report_type === "feature") {
    return {
      reportType: report.report_type,
      headerLabel: "Feature Request",
      title,
      problem: null,
      expectedBehavior: null,
      actualBehavior: null,
      stepsToReproduce: null,
      userStory: buildGenericFeatureUserStory(report),
      description: details,
      acceptanceCriteria: buildFeatureAcceptanceCriteria(report),
      evidence,
    };
  }

  if (report.report_type === "bug") {
    return {
      reportType: report.report_type,
      headerLabel: "Bug Report",
      title,
      problem: details,
      expectedBehavior: buildGenericBugExpectedBehavior(report),
      actualBehavior: details,
      stepsToReproduce: steps,
      userStory: null,
      description: null,
      acceptanceCriteria: buildBugAcceptanceCriteria(report),
      evidence,
    };
  }

  return {
    reportType: report.report_type,
    headerLabel: "Feedback Report",
    title,
    problem: details,
    expectedBehavior: null,
    actualBehavior: details,
    stepsToReproduce: steps,
    userStory: null,
    description: details,
    acceptanceCriteria: buildBugAcceptanceCriteria(report),
    evidence,
  };
}

export function summarizeDiscordFeedbackEvidence(evidence: DiscordFeedbackCardEvidence[]): string {
  const screenshotCount = evidence.filter((item) => item.kind === "screenshot").length;
  const attachmentCount = evidence.filter((item) => item.kind === "attachment").length;

  if (screenshotCount === 0 && attachmentCount === 0) {
    return "No screenshot or attachment evidence was provided.";
  }

  const parts: string[] = [];
  if (screenshotCount > 0) {
    parts.push(`${screenshotCount} screenshot${screenshotCount === 1 ? "" : "s"}`);
  }
  if (attachmentCount > 0) {
    parts.push(`${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}`);
  }

  return `Evidence included: ${parts.join(" and ")}.`;
}

export function formatDiscordBugReportStatusLabel(status: DiscordBugReportStatus): string {
  return DISCORD_BUG_REPORT_STATUS_TAG_LABELS[status];
}

export function formatDiscordFeedbackDisplayStatusLabel(args: {
  reportType: DiscordBugReportReportType;
  status: DiscordBugReportStatus;
}): string {
  if (args.reportType === "feature" && args.status === "fixed") {
    return "Resolved";
  }

  return formatDiscordBugReportStatusLabel(args.status);
}

export function formatDiscordBugReportTypeLabel(reportType: DiscordBugReportReportType): string {
  return DISCORD_BUG_REPORT_TYPE_TAG_LABELS[reportType];
}

export function formatDiscordFeedbackEffortPoints(value: DiscordFeedbackEffortPoints | null | undefined): string {
  return typeof value === "number" ? String(value) : "Unscored";
}

export function normalizeDiscordFeedbackReportType(value: string | null | undefined): DiscordBugReportReportType | null {
  const normalized = normalizeTextInput(value, 20)?.toLowerCase();
  if (normalized === "bug") {
    return "bug";
  }

  if (normalized === "feature" || normalized === "feat") {
    return "feature";
  }

  return null;
}

export function normalizeDiscordBugReportStatus(value: string | null | undefined): DiscordBugReportStatus | null {
  const normalized = normalizeTextInput(value, 40)?.toLowerCase();
  return normalized && normalized in DISCORD_BUG_REPORT_STATUS_TAG_LABELS
    ? normalized as DiscordBugReportStatus
    : null;
}

export function formatDiscordBugReportShortId(reportId: string): string {
  const normalized = String(reportId ?? "").trim();
  if (!normalized) {
    return "unknown";
  }

  return normalized.split("-")[0]?.slice(0, 8) ?? normalized.slice(0, 8);
}

export function buildDiscordBugReporterLabel(args: {
  reporterDiscordUsername: string | null;
  reporterMemberNumber: number | null;
}): string {
  if (typeof args.reporterMemberNumber === "number") {
    return `Member #${args.reporterMemberNumber}`;
  }

  return args.reporterDiscordUsername ?? "Unknown Discord user";
}

export function buildDiscordBugReporterMention(args: {
  reporterDiscordUserId: string;
  reporterLabel: string;
}): string {
  return `<@${args.reporterDiscordUserId}> / ${args.reporterLabel}`;
}

export function buildDiscordAllowedMentions(args: {
  reporterDiscordUserId: string | null;
  includeReporter: boolean;
}): DiscordAllowedMentions {
  return {
    parse: [],
    users: args.includeReporter && args.reporterDiscordUserId ? [args.reporterDiscordUserId] : [],
    roles: [],
    replied_user: false,
  };
}

export function buildDiscordBugForumTagNames(args: {
  reportType: DiscordBugReportReportType;
  status: DiscordBugReportStatus;
  severity: DiscordBugReportSeverity;
  includeBacklog?: boolean;
}): string[] {
  const statusLabel = args.reportType === "feature"
    ? formatDiscordFeedbackDisplayStatusLabel({
      reportType: args.reportType,
      status: args.status,
    })
    : formatDiscordBugReportStatusLabel(args.status);
  const names = [
    formatDiscordBugReportTypeLabel(args.reportType),
    statusLabel,
  ];

  if (args.reportType !== "feature" && args.status !== "spam") {
    names.push(formatForumSeverityLabel(args.severity));
  }

  if (args.includeBacklog) {
    names.push(DISCORD_FEEDBACK_BACKLOG_TAG_LABEL);
  }

  return [...new Set(names)].slice(0, 5);
}

export function shouldApplyDiscordFeedbackBacklogTag(report: Pick<
  DiscordBugReportRow,
  "status" | "discord_forum_channel_id" | "area" | "summary" | "details"
>): boolean {
  if (isDiscordFeedbackTestingCard(report)) {
    return false;
  }

  return report.status === "confirmed" || report.status === "fawxzzy_review";
}

export function buildDiscordBugForumThreadTitle(args: {
  reportType: DiscordBugReportReportType;
  area: string | null;
  summary: string;
}): string {
  return `${formatDiscordBugReportTypeLabel(args.reportType)}: ${formatForumAreaLabel(args.area)} \u2014 ${formatForumSummary(args.summary)}`
    .slice(0, DISCORD_BUG_REPORT_FORUM_TITLE_MAX_LENGTH);
}

function renderForumBodyValue(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return neutralizeDiscordMentions(value);
}

function truncateForumDisplayValue(value: string, maxLength: number): string {
  const normalized = neutralizeDiscordMentions(value).trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function renderForumBodyDisplayValue(args: {
  value: string | null;
  fallback: string;
  maxLength: number;
}): string {
  if (!args.value) {
    return args.fallback;
  }

  const truncated = truncateForumDisplayValue(args.value, args.maxLength);
  return truncated || args.fallback;
}

function renderAttachmentLine(attachment: DiscordFeedbackAttachmentMetadata): string {
  const displayUrl = attachment.url ?? attachment.proxyUrl;
  if (!displayUrl) {
    return `- ${attachment.filename} (${attachment.contentType}, ${attachment.size} bytes)`;
  }

  return `- ${attachment.filename} (${attachment.contentType}, ${attachment.size} bytes): ${truncateForumDisplayValue(displayUrl, 180)}`;
}

function trimDiscordForumBodyLength(body: string): string {
  if (body.length <= DISCORD_BUG_REPORT_FORUM_BODY_MAX_LENGTH) {
    return body;
  }

  return `${body.slice(0, Math.max(0, DISCORD_BUG_REPORT_FORUM_BODY_MAX_LENGTH - 3)).trimEnd()}...`;
}

function buildFeatureForumDescription(args: {
  sharedLines: string[];
  userStory: string;
  description: string;
  acceptanceCriteriaLines: string[];
  evidenceLines: string[];
}): string {
  const bodyTemplate = [
    ...args.sharedLines,
    "**User Story**",
    args.userStory,
    "",
    "**Description**",
    FEATURE_FORUM_DESCRIPTION_PLACEHOLDER,
    "",
    "**Acceptance Criteria**",
    ...args.acceptanceCriteriaLines,
    "",
    "**Evidence**",
    ...args.evidenceLines,
  ].join("\n");

  const reservedLength = bodyTemplate.length - FEATURE_FORUM_DESCRIPTION_PLACEHOLDER.length;
  const remainingDescriptionBudget = Math.max(
    "Not provided".length,
    DISCORD_BUG_REPORT_FORUM_BODY_MAX_LENGTH - reservedLength,
  );

  const description = truncateForumDisplayValue(args.description, remainingDescriptionBudget) || "Not provided";

  return trimDiscordForumBodyLength(
    bodyTemplate.replace(FEATURE_FORUM_DESCRIPTION_PLACEHOLDER, description),
  );
}

function buildDiscordBugForumThreadBodyHeader(args: {
  reportType: DiscordBugReportReportType;
}): string {
  const typeEmoji = args.reportType === "bug"
    ? buildDiscordFeedbackEmojiPrefix("Bug")
    : args.reportType === "feature"
      ? buildDiscordFeedbackEmojiPrefix("Feature")
      : "";
  const feedbackHeader = args.reportType === "bug"
    ? "Bug Report"
    : args.reportType === "feature"
      ? "Feature Request"
      : "Feedback Report";

  return `${typeEmoji ? `${typeEmoji} ` : ""}**${feedbackHeader}**`;
}

export function buildDiscordBugForumThreadBody(args: {
  report: DiscordBugReportRow;
  reporterLabel: string;
}): string {
  const sections = buildDiscordFeedbackCardSections(args.report);
  const reporterLine = buildDiscordBugReporterMention({
    reporterDiscordUserId: args.report.reporter_discord_user_id,
    reporterLabel: args.reporterLabel,
  });
  const sharedLines = [
    buildDiscordBugForumThreadBodyHeader({
      reportType: args.report.report_type,
    }),
    `Type: ${formatDiscordBugReportTypeLabel(args.report.report_type)}`,
    `Status: ${formatDiscordFeedbackDisplayStatusLabel({
      reportType: args.report.report_type,
      status: args.report.status,
    })}`,
    `Points: ${formatDiscordFeedbackEffortPoints(args.report.effort_points)}`,
  ];

  if (args.report.report_type !== "feature") {
    sharedLines.push(`Severity: ${formatForumSeverityLabel(args.report.severity)}`);
  }

  sharedLines.push(
    `Area: ${formatForumAreaLabel(args.report.area)}`,
    `Reporter: ${reporterLine}`,
    `Report ID: \`${formatDiscordBugReportShortId(args.report.id)}\``,
    `Duplicate signals: ${Math.max(1, Number(args.report.duplicate_count ?? 1))}`,
    "",
    "**Title**",
    sections.title,
    "",
  );
  const acceptanceCriteriaLines = sections.acceptanceCriteria.map((criterion) => `- ${criterion}`);
  const evidenceLines = sections.evidence.map((item) => item.value);

  if (args.report.report_type === "feature") {
    return buildFeatureForumDescription({
      sharedLines,
      userStory: renderForumBodyValue(sections.userStory, "Not provided"),
      description: renderForumBodyValue(sections.description, "Not provided"),
      acceptanceCriteriaLines,
      evidenceLines,
    });
  }

  if (args.report.report_type === "bug") {
    return trimDiscordForumBodyLength([
      ...sharedLines,
      "**Problem**",
      renderForumBodyValue(sections.problem, "Not provided"),
      "",
      "**Expected behavior**",
      renderForumBodyValue(sections.expectedBehavior, "Not provided"),
      "",
      "**Actual behavior**",
      renderForumBodyValue(sections.actualBehavior, "Not provided"),
      "",
      "**Steps to reproduce**",
      renderForumBodyValue(sections.stepsToReproduce, "Not provided"),
      "",
      "**Acceptance Criteria**",
      ...acceptanceCriteriaLines,
      "",
      "**Evidence**",
      ...evidenceLines,
    ].join("\n"));
  }

  return trimDiscordForumBodyLength([
    ...sharedLines,
    "**Details**",
    renderForumBodyValue(sections.description ?? sections.problem, "Not provided"),
    "",
    "**Steps**",
    renderForumBodyValue(sections.stepsToReproduce, "Not provided"),
    "",
    "**Acceptance Criteria**",
    ...acceptanceCriteriaLines,
    "",
    "**Evidence**",
    ...evidenceLines,
  ].join("\n"));
}

export function buildDiscordBugForumDuplicateReply(args: {
  reportType: DiscordBugReportReportType;
  reporterLabel: string;
  duplicateCount: number;
}): string {
  return buildFeedbackCardAuditComment({
    action: "duplicate_signal",
    duplicateCount: args.duplicateCount,
    reportType: args.reportType,
  });
}

export function buildDiscordFeedbackWithdrawThreadReply(args?: {
  actorLabel?: string | null;
  reportType?: DiscordBugReportReportType | null;
}): string {
  return buildFeedbackCardAuditComment({
    action: "withdraw",
    actorLabel: args?.actorLabel ?? "reporter",
    reportType: args?.reportType ?? null,
  });
}

export function buildDiscordFeedbackUpdateThreadReply(args: {
  reportType?: DiscordBugReportReportType | null;
  updateDetails: string;
  updaterLabel: string;
  action?: "reporter_update" | "staff_update";
}): string {
  return buildFeedbackCardAuditComment({
    action: args.action ?? "reporter_update",
    actorLabel: args.updaterLabel,
    note: args.updateDetails,
    reportType: args.reportType ?? null,
  });
}

export function buildDiscordBugStatusThreadReply(args: {
  reportType?: DiscordBugReportReportType | null;
  statusBefore?: DiscordBugReportStatus | null;
  status: DiscordBugReportStatus;
  note: string | null;
  reporterDiscordUserId: string | null;
  includeReporterMention: boolean;
  actorLabel?: string | null;
}): string {
  const prefix = args.includeReporterMention && args.reporterDiscordUserId
    ? `<@${args.reporterDiscordUserId}> `
    : "";

  return `${prefix}${buildFeedbackCardAuditComment({
    action: "status_update",
    actorLabel: args.actorLabel ?? "Fawx Security",
    reportType: args.reportType ?? "bug",
    statusBefore: args.statusBefore ?? null,
    statusAfter: args.status,
    note: args.note,
  })}`;
}

export function buildFeedbackCardAuditComment(args: {
  action: DiscordFeedbackCardAuditAction;
  actorLabel?: string | null;
  reportType?: DiscordBugReportReportType | null;
  statusBefore?: DiscordBugReportStatus | null;
  statusAfter?: DiscordBugReportStatus | null;
  completionReviewStatus?: DiscordFeedbackCompletionReviewStatus | null;
  note?: string | null;
  reportId?: string | null;
  duplicateCount?: number | null;
}): string {
  const reportType = args.reportType ?? "bug";
  const lines: string[] = [];
  const noteSummary = summarizeDiscordAuditText(args.note);

  switch (args.action) {
    case "status_update": {
      const actorLabel = args.actorLabel?.trim() || "Fawx Security";
      const isResolved = args.statusAfter === "fixed" || args.statusAfter === "closed";
      lines.push(isResolved ? `Marked resolved by ${actorLabel}.` : `Card updated by ${actorLabel}.`);

      const beforeLabel = args.statusBefore
        ? formatDiscordFeedbackDisplayStatusLabel({
          reportType,
          status: args.statusBefore,
        })
        : null;
      const afterLabel = args.statusAfter
        ? formatDiscordFeedbackDisplayStatusLabel({
          reportType,
          status: args.statusAfter,
        })
        : null;

      if (beforeLabel && afterLabel && beforeLabel !== afterLabel) {
        lines.push(`Status: ${beforeLabel} -> ${afterLabel}`);
      } else if (afterLabel) {
        lines.push(`Status: ${afterLabel}`);
      }

      if (noteSummary) {
        lines.push(`Note: ${noteSummary}`);
      }
      if (args.completionReviewStatus === "pending") {
        lines.push("Completion Review: Pending Fawxzzy review.");
      }
      break;
    }
    case "completion_review": {
      const actorLabel = args.actorLabel?.trim() || "Fawx Security";
      if (args.completionReviewStatus === "approved") {
        lines.push(`Completion Review approved by ${actorLabel}.`);
      } else if (args.completionReviewStatus === "needs_followup") {
        lines.push("Completion Review needs follow-up.");
      } else {
        lines.push(`Completion Review updated by ${actorLabel}.`);
      }
      if (noteSummary) {
        lines.push(`Note: ${noteSummary}`);
      }
      break;
    }
    case "withdraw": {
      const actorLabel = args.actorLabel?.trim() || "reporter";
      lines.push(`Feedback withdrawn by ${actorLabel}.`);
      lines.push("Details and attachments were removed from the public card.");
      break;
    }
    case "reporter_update":
    case "staff_update": {
      lines.push(args.action === "staff_update" ? "Staff added an update." : "Reporter added an update.");
      if (noteSummary) {
        lines.push(noteSummary);
      }
      break;
    }
    case "duplicate_signal":
      lines.push("Duplicate signal added.");
      lines.push(`Duplicate signals: ${Math.max(1, Number(args.duplicateCount ?? 1))}`);
      break;
    case "sync_format": {
      const actorLabel = args.actorLabel?.trim() || "Fawx Security";
      lines.push(`Card formatting synced by ${actorLabel}.`);
      lines.push(`Reason: ${noteSummary ?? "Applied Feedback Card Structure v3."}`);
      break;
    }
    default:
      lines.push("Card updated by Fawx Security.");
      break;
  }

  return lines.join("\n");
}

export async function postFeedbackCardAuditComment(args: {
  threadId: string;
  action: DiscordFeedbackCardAuditAction;
  actorLabel?: string | null;
  reportType?: DiscordBugReportReportType | null;
  reporterDiscordUserId?: string | null;
  includeReporterMention?: boolean;
  statusBefore?: DiscordBugReportStatus | null;
  statusAfter?: DiscordBugReportStatus | null;
  completionReviewStatus?: DiscordFeedbackCompletionReviewStatus | null;
  note?: string | null;
  reportId?: string | null;
  duplicateCount?: number | null;
  allowedMentions?: DiscordAllowedMentions | null;
}): Promise<{ ok: true; messageId: string | null } | { ok: false; code: string; status: number; message: string | null }> {
  return createDiscordThreadMessage({
    threadId: args.threadId,
    content: buildFeedbackCardAuditComment(args),
    allowedMentions: args.allowedMentions ?? buildDiscordAllowedMentions({
      reporterDiscordUserId: args.reporterDiscordUserId ?? null,
      includeReporter: Boolean(args.includeReporterMention),
    }),
  });
}

export function extractDiscordBugReportModalFields(
  components: unknown,
  readField: (components: unknown, inputCustomId: string) => string | null,
): DiscordBugReportModalFields {
  return {
    summary: readField(components, "bug_summary"),
    area: readField(components, "bug_area"),
    details: readField(components, "bug_details"),
  };
}

export function normalizeDiscordBugSeverity(value: string | null | undefined): DiscordBugReportSeverity {
  const normalized = normalizeTextInput(value, DISCORD_BUG_REPORT_SEVERITY_MAX_LENGTH)?.toLowerCase() ?? "";

  if (normalized === "low" || normalized === "minor" || normalized === "small") {
    return "low";
  }

  if (normalized === "high" || normalized === "major" || normalized === "urgent") {
    return "high";
  }

  if (normalized === "blocker" || normalized === "critical" || normalized === "sev0" || normalized === "sev-0") {
    return "blocker";
  }

  return "medium";
}

export function splitDiscordBugStepsAndScreenshot(value: string | null | undefined): {
  steps: string | null;
  screenshotUrl: string | null;
} {
  const normalized = normalizeTextInput(value, DISCORD_BUG_REPORT_STEPS_MAX_LENGTH);
  if (!normalized) {
    return { steps: null, screenshotUrl: null };
  }

  const urlMatch = normalized.match(/https?:\/\/\S+/i);
  if (!urlMatch) {
    return { steps: normalized, screenshotUrl: null };
  }

  const candidateUrl = urlMatch[0].replace(/[),.;!?]+$/g, "");
  let screenshotUrl: string | null = null;

  try {
    const parsedUrl = new URL(candidateUrl);
    if ((parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") && parsedUrl.toString().length <= DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH) {
      screenshotUrl = parsedUrl.toString();
    }
  } catch {
    screenshotUrl = null;
  }

  const steps = normalizeTextInput(
    normalized
      .replace(urlMatch[0], " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " "),
    DISCORD_BUG_REPORT_STEPS_MAX_LENGTH,
  );

  return { steps, screenshotUrl };
}

export function createDiscordBugReportDuplicateFingerprint(args: {
  reportType: DiscordBugReportReportType;
  area: string | null;
  summary: string;
}): string {
  return buildDuplicateSignal({
    reportType: args.reportType,
    area: args.area,
    summary: args.summary,
    details: null,
  }).fingerprint;
}

export function normalizeDiscordBugReportInput(
  modalFields: DiscordBugReportModalFields,
  reportType: DiscordBugReportReportType = "bug",
): NormalizedDiscordBugReportInput | null {
  const summary = normalizeTextInput(modalFields.summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH);
  const details = normalizeTextInput(modalFields.details, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);
  if (!summary || !details) {
    return null;
  }

  const area = normalizeTextInput(modalFields.area, DISCORD_BUG_REPORT_AREA_MAX_LENGTH);
  const duplicateSignal = buildDuplicateSignal({
    reportType,
    area,
    summary,
    details,
  });

  return {
    reportType,
    area,
    severity: "medium",
    summary,
    details,
    stepsToReproduce: null,
    screenshotUrl: null,
    duplicateFingerprint: duplicateSignal.fingerprint,
    duplicateAreaKey: duplicateSignal.areaKey,
    duplicateSummaryKey: duplicateSignal.summaryKey,
    duplicateDetailKey: duplicateSignal.detailKey,
    duplicateSummaryTokens: duplicateSignal.summaryTokens,
    duplicateDetailTokens: duplicateSignal.detailTokens,
    duplicateCombinedTokens: duplicateSignal.combinedTokens,
  };
}

async function countRecentDiscordBugReports(admin: DiscordBugReportsAdminClient, reporterDiscordUserId: string, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - DISCORD_BUG_REPORT_RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await admin
    .from("discord_feedback_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_discord_user_id", reporterDiscordUserId)
    .gte("last_seen_at", cutoff);

  if (error) {
    throw new Error(`Failed to count recent discord bug reports: ${error.message}`);
  }

  return count ?? 0;
}

async function resolveDiscordBugReporterLink(admin: DiscordBugReportsAdminClient, reporterDiscordUserId: string): Promise<DiscordBugReporterLink> {
  const { data, error } = await admin
    .from("discord_member_links")
    .select("fitness_user_id, user_number, user_kind")
    .eq("discord_user_id", reporterDiscordUserId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load discord member link: ${error.message}`);
  }

  return {
    fitnessUserId: typeof data?.fitness_user_id === "string" ? data.fitness_user_id : null,
    memberNumber: typeof data?.user_number === "number" ? data.user_number : null,
    userKind: coerceUserKind(data?.user_kind),
  };
}

async function findDuplicateDiscordBugReport(args: {
  admin: DiscordBugReportsAdminClient;
  normalizedInput: NormalizedDiscordBugReportInput;
  now: Date;
}): Promise<DiscordBugReportRow | null> {
  const { data, error } = await args.admin
    .from("discord_feedback_reports")
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .eq("report_type", args.normalizedInput.reportType)
    .in("status", [...DISCORD_BUG_REPORT_DUPLICATE_ACTIVE_STATUSES])
    .gte("last_seen_at", buildDuplicateLookupCutoff(args.now))
    .order("last_seen_at", { ascending: false })
    .limit(DISCORD_BUG_REPORT_DUPLICATE_CANDIDATE_LIMIT);

  if (error || !Array.isArray(data)) {
    throw new Error(`Failed to look up duplicate discord bug report: ${error?.message ?? "missing rows"}`);
  }

  const candidates = data
    .map((row) => coerceBugReportRow(row))
    .filter((row): row is DiscordBugReportRow => Boolean(row));

  let bestMatch: DiscordBugReportRow | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreDuplicateCandidate({
      candidate,
      normalizedInput: args.normalizedInput,
    });
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  }

  return bestScore >= 70 ? bestMatch : null;
}

async function insertDiscordBugReport(admin: DiscordBugReportsAdminClient, values: Record<string, unknown>): Promise<DiscordBugReportRow> {
  const { data, error } = await admin
    .from("discord_feedback_reports")
    .insert(values)
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .single();

  const row = coerceBugReportRow(data);
  if (error || !row) {
    throw new Error(`Failed to insert discord bug report: ${error?.message ?? "missing row"}`);
  }

  return row;
}

async function updateDuplicateDiscordBugReport(args: {
  admin: DiscordBugReportsAdminClient;
  existingReport: DiscordBugReportRow;
  reporterDiscordUsername: string | null;
  reporterLink: DiscordBugReporterLink;
  interactionId: string | null;
  nowIso: string;
}): Promise<DiscordBugReportRow> {
  const duplicateCount = Math.max(1, Number(args.existingReport.duplicate_count ?? 1)) + 1;
  const { data, error } = await args.admin
    .from("discord_feedback_reports")
    .update({
      duplicate_count: duplicateCount,
      effort_points: estimateDiscordFeedbackEffortPoints({
        ...args.existingReport,
        duplicate_count: duplicateCount,
      }),
      last_seen_at: args.nowIso,
      updated_at: args.nowIso,
      reporter_discord_username: args.existingReport.reporter_discord_username ?? normalizeTextInput(args.reporterDiscordUsername, 80),
      reporter_fitness_user_id: args.existingReport.reporter_fitness_user_id ?? args.reporterLink.fitnessUserId,
      reporter_member_number: args.existingReport.reporter_member_number ?? args.reporterLink.memberNumber,
      reporter_user_kind: args.existingReport.reporter_user_kind ?? args.reporterLink.userKind,
      discord_interaction_id: args.existingReport.discord_interaction_id ?? args.interactionId,
    })
    .eq("id", args.existingReport.id)
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .single();

  const row = coerceBugReportRow(data);
  if (error || !row) {
    throw new Error(`Failed to update duplicate discord bug report: ${error?.message ?? "missing row"}`);
  }

  return row;
}

async function findDiscordBugReportByFullId(admin: DiscordBugReportsAdminClient, reportId: string): Promise<DiscordBugReportRow | null> {
  const { data, error } = await admin
    .from("discord_feedback_reports")
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load discord bug report by id: ${error.message}`);
  }

  return coerceBugReportRow(data);
}

async function findDiscordBugReportByForumThreadId(admin: DiscordBugReportsAdminClient, threadId: string): Promise<DiscordBugReportRow | null> {
  const { data, error } = await admin
    .from("discord_feedback_reports")
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .eq("discord_forum_thread_id", threadId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load discord bug report by forum thread id: ${error.message}`);
  }

  return coerceBugReportRow(data);
}

async function findDiscordBugReportByShortId(admin: DiscordBugReportsAdminClient, shortId: string): Promise<DiscordBugReportRow | null> {
  const bounds = buildUuidBoundsFromPrefix(shortId);
  if (!bounds) {
    return null;
  }

  const { data, error } = await admin
    .from("discord_feedback_reports")
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .gte("id", bounds.lower)
    .lte("id", bounds.upper)
    .limit(2);

  if (error) {
    throw new Error(`Failed to load discord bug report by short id: ${error.message}`);
  }

  const rows = Array.isArray(data) ? data.map((row) => coerceBugReportRow(row)).filter(Boolean) : [];
  if (rows.length > 1) {
    throw new Error("Discord bug report short id matched multiple rows.");
  }

  return rows.length === 1 ? rows[0] ?? null : null;
}

export async function createDiscordBugReport(args: {
  interactionId: string | null;
  reporterDiscordUserId: string;
  reporterDiscordUsername: string | null;
  reportType?: DiscordBugReportReportType;
  modalFields: DiscordBugReportModalFields;
  attachments?: DiscordFeedbackAttachmentMetadata[];
  adminClient?: DiscordBugReportsAdminClient;
  now?: Date;
}): Promise<
  | { ok: true; duplicate: false; report: DiscordBugReportRow; reporterLink: DiscordBugReporterLink }
  | { ok: true; duplicate: true; report: DiscordBugReportRow; reporterLink: DiscordBugReporterLink }
  | { ok: false; code: "DISCORD_BUG_REPORT_INVALID_INPUT" | "DISCORD_BUG_REPORT_RATE_LIMITED" | "DISCORD_BUG_REPORT_SAVE_FAILED" }
> {
  if (!isDiscordSnowflake(args.reporterDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const normalizedInput = normalizeDiscordBugReportInput(args.modalFields, args.reportType ?? "bug");
  if (!normalizedInput) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);
  const now = args.now ?? new Date();
  const nowIso = now.toISOString();

  try {
    const recentCount = await countRecentDiscordBugReports(admin, args.reporterDiscordUserId, now);
    if (recentCount >= DISCORD_BUG_REPORT_RATE_LIMIT_MAX_REPORTS) {
      return { ok: false, code: "DISCORD_BUG_REPORT_RATE_LIMITED" };
    }

    const reporterLink = await resolveDiscordBugReporterLink(admin, args.reporterDiscordUserId);
    const existingDuplicate = await findDuplicateDiscordBugReport({
      admin,
      normalizedInput,
      now,
    });

    if (existingDuplicate) {
      const report = await updateDuplicateDiscordBugReport({
        admin,
        existingReport: existingDuplicate,
        reporterDiscordUsername: args.reporterDiscordUsername,
        reporterLink,
        interactionId: args.interactionId,
        nowIso,
      });

      return { ok: true, duplicate: true, report, reporterLink };
    }

    const report = await insertDiscordBugReport(admin, {
      source: "discord",
      report_type: normalizedInput.reportType,
      status: "new",
      severity: normalizedInput.severity,
      effort_points: estimateDiscordFeedbackEffortPoints({
        report_type: normalizedInput.reportType,
        severity: normalizedInput.severity,
        area: normalizedInput.area,
        summary: normalizedInput.summary,
        details: normalizedInput.details,
        steps_to_reproduce: normalizedInput.stepsToReproduce,
        attachment_count: Math.max(0, Math.min(args.attachments?.length ?? 0, DISCORD_FEEDBACK_ATTACHMENT_MAX_COUNT)),
        duplicate_count: 1,
      }),
      area: normalizedInput.area,
      summary: normalizedInput.summary,
      details: normalizedInput.details,
      steps_to_reproduce: normalizedInput.stepsToReproduce,
      screenshot_url: normalizedInput.screenshotUrl,
      attachment_count: Math.max(0, Math.min(args.attachments?.length ?? 0, DISCORD_FEEDBACK_ATTACHMENT_MAX_COUNT)),
      attachment_metadata: Array.isArray(args.attachments) && args.attachments.length > 0 ? args.attachments : null,
      attachment_pruned: false,
      reporter_discord_user_id: args.reporterDiscordUserId,
      reporter_discord_username: normalizeTextInput(args.reporterDiscordUsername, 80),
      reporter_fitness_user_id: reporterLink.fitnessUserId,
      reporter_member_number: reporterLink.memberNumber,
      reporter_user_kind: reporterLink.userKind,
      discord_interaction_id: args.interactionId,
      duplicate_fingerprint: normalizedInput.duplicateFingerprint,
      duplicate_count: 1,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      details_pruned: false,
    });

    return { ok: true, duplicate: false, report, reporterLink };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_SAVE_FAILED" };
  }
}

export async function findDiscordBugReportByIdOrPrefix(args: {
  reportIdOrPrefix: string;
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<
  | { ok: true; report: DiscordBugReportRow }
  | { ok: false; code: "DISCORD_BUG_REPORT_NOT_FOUND" | "DISCORD_BUG_REPORT_AMBIGUOUS_ID" | "DISCORD_BUG_REPORT_LOOKUP_FAILED" }
> {
  const normalized = String(args.reportIdOrPrefix ?? "").trim();
  if (!normalized) {
    return { ok: false, code: "DISCORD_BUG_REPORT_NOT_FOUND" };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    if (isUuidLike(normalized)) {
      const report = await findDiscordBugReportByFullId(admin, normalized);
      return report ? { ok: true, report } : { ok: false, code: "DISCORD_BUG_REPORT_NOT_FOUND" };
    }

    const forumThreadCandidates = extractDiscordForumThreadLookupCandidates(normalized);
    for (const threadId of forumThreadCandidates) {
      const report = await findDiscordBugReportByForumThreadId(admin, threadId);
      if (report) {
        return { ok: true, report };
      }
    }

    if (isShortReportIdPrefix(normalized)) {
      const report = await findDiscordBugReportByShortId(admin, normalized);
      return report
        ? { ok: true, report }
        : { ok: false, code: "DISCORD_BUG_REPORT_NOT_FOUND" };
    }

    return { ok: false, code: "DISCORD_BUG_REPORT_NOT_FOUND" };
  } catch (error) {
    if (error instanceof Error && error.message === "Discord bug report short id matched multiple rows.") {
      return { ok: false, code: "DISCORD_BUG_REPORT_AMBIGUOUS_ID" };
    }

    return { ok: false, code: "DISCORD_BUG_REPORT_LOOKUP_FAILED" };
  }
}

export async function listRecentDiscordFeedbackReports(args: {
  reporterDiscordUserId?: string | null;
  limit?: number;
  excludedStatuses?: DiscordBugReportStatus[];
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<
  | { ok: true; reports: DiscordFeedbackReportSelectCandidate[] }
  | { ok: false; code: "DISCORD_BUG_REPORT_INVALID_INPUT" | "DISCORD_BUG_REPORT_LOOKUP_FAILED" }
> {
  if (args.reporterDiscordUserId && !isDiscordSnowflake(args.reporterDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const limit = Math.min(Math.max(args.limit ?? 10, 1), 25);
  const excludedStatuses = new Set(args.excludedStatuses ?? []);
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const query = admin
      .from("discord_feedback_reports")
      .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
      .order("updated_at", { ascending: false })
      .limit(Math.max(limit * 3, 15));

    const scopedQuery = args.reporterDiscordUserId
      ? query.eq("reporter_discord_user_id", args.reporterDiscordUserId)
      : query;

    const { data, error } = await scopedQuery;

    if (error || !Array.isArray(data)) {
      return { ok: false, code: "DISCORD_BUG_REPORT_LOOKUP_FAILED" };
    }

    const reports = data
      .map((row) => coerceBugReportRow(row))
      .filter((row): row is DiscordBugReportRow => Boolean(row))
      .filter((row) => !excludedStatuses.has(row.status))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        report_type: row.report_type,
        status: row.status,
        area: row.area,
        summary: row.summary,
        updated_at: row.updated_at,
      }));

    return { ok: true, reports };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_LOOKUP_FAILED" };
  }
}

export async function updateDiscordFeedbackReportContent(args: {
  reportId: string;
  summary: string;
  area: string | null;
  details: string;
  updatedByDiscordUserId: string;
  adminClient?: DiscordBugReportsAdminClient;
  now?: Date;
}): Promise<
  | { ok: true; report: DiscordBugReportRow }
  | { ok: false; code: "DISCORD_BUG_REPORT_UPDATE_FAILED" | "DISCORD_BUG_REPORT_INVALID_INPUT" }
> {
  if (!isDiscordSnowflake(args.updatedByDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const normalizedSummary = normalizeTextInput(args.summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH);
  const normalizedArea = normalizeTextInput(args.area, DISCORD_BUG_REPORT_AREA_MAX_LENGTH);
  const normalizedDetails = normalizeTextInput(args.details, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);

  if (!normalizedSummary || !normalizedDetails) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const nowIso = (args.now ?? new Date()).toISOString();
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const existingLookup = await findDiscordBugReportByFullId(admin, args.reportId);
    if (!existingLookup) {
      return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
    }

    const { data, error } = await admin
      .from("discord_feedback_reports")
      .update({
        summary: normalizedSummary,
        area: normalizedArea,
        details: normalizedDetails,
        effort_points: estimateDiscordFeedbackEffortPoints({
          ...existingLookup,
          area: normalizedArea,
          summary: normalizedSummary,
          details: normalizedDetails,
        }),
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", args.reportId)
      .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
      .single();

    const row = coerceBugReportRow(data);
    if (error || !row) {
      return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
    }

    return { ok: true, report: row };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
  }
}

export async function updateDiscordBugReportStatus(args: {
  reportId: string;
  status: DiscordBugReportStatus;
  note: string | null;
  updatedByDiscordUserId: string;
  adminClient?: DiscordBugReportsAdminClient;
  now?: Date;
}): Promise<
  | { ok: true; report: DiscordBugReportRow }
  | { ok: false; code: "DISCORD_BUG_REPORT_STATUS_UPDATE_FAILED" | "DISCORD_BUG_REPORT_INVALID_INPUT" }
> {
  if (!isDiscordSnowflake(args.updatedByDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const normalizedNote = normalizeTextInput(args.note, DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH);
  const nowIso = (args.now ?? new Date()).toISOString();
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const values: Record<string, unknown> = {
      status: args.status,
      status_updated_at: nowIso,
      status_updated_by_discord_user_id: args.updatedByDiscordUserId,
      status_note: normalizedNote,
      updated_at: nowIso,
      closed_at: args.status === "closed" ? nowIso : null,
    };

    const { data, error } = await admin
    .from("discord_feedback_reports")
      .update(values)
      .eq("id", args.reportId)
      .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
      .single();

    const row = coerceBugReportRow(data);
    if (error || !row) {
      return { ok: false, code: "DISCORD_BUG_REPORT_STATUS_UPDATE_FAILED" };
    }

    return { ok: true, report: row };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_STATUS_UPDATE_FAILED" };
  }
}

export async function updateDiscordFeedbackCompletionReview(args: DiscordFeedbackCompletionReviewUpdate): Promise<
  | { ok: true; report: DiscordBugReportRow }
  | { ok: false; code: "DISCORD_BUG_REPORT_UPDATE_FAILED" | "DISCORD_BUG_REPORT_INVALID_INPUT" }
> {
  if (!isDiscordSnowflake(args.reviewedByDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const nowIso = (args.reviewedAt ?? new Date()).toISOString();
  const normalizedNote = normalizeTextInput(args.note, DISCORD_FEEDBACK_COMPLETION_REVIEW_NOTE_MAX_LENGTH);
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);
  const isReviewedDecision = args.completionReviewStatus === "approved" || args.completionReviewStatus === "needs_followup";

  try {
    const { data, error } = await admin
      .from("discord_feedback_reports")
      .update({
        completion_review_status: args.completionReviewStatus,
        completion_reviewed_at: isReviewedDecision ? nowIso : null,
        completion_reviewed_by_discord_user_id: isReviewedDecision ? args.reviewedByDiscordUserId : null,
        completion_review_note: isReviewedDecision ? normalizedNote : null,
        updated_at: nowIso,
      })
      .eq("id", args.reportId)
      .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
      .single();

    const row = coerceBugReportRow(data);
    if (error || !row) {
      return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
    }

    return { ok: true, report: row };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
  }
}

export async function recordDiscordFeedbackReportUpdate(args: {
  reportId: string;
  updateDetails: string;
  updatedByDiscordUserId: string;
  adminClient?: DiscordBugReportsAdminClient;
  now?: Date;
}): Promise<
  | { ok: true; report: DiscordBugReportRow }
  | { ok: false; code: "DISCORD_BUG_REPORT_UPDATE_FAILED" | "DISCORD_BUG_REPORT_INVALID_INPUT" }
> {
  if (!isDiscordSnowflake(args.updatedByDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const normalizedUpdateDetails = normalizeTextInput(args.updateDetails, DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH);
  if (!normalizedUpdateDetails) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const nowIso = (args.now ?? new Date()).toISOString();
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const { data, error } = await admin
      .from("discord_feedback_reports")
      .update({
        status_note: normalizedUpdateDetails,
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", args.reportId)
      .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
      .single();

    const row = coerceBugReportRow(data);
    if (error || !row) {
      return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
    }

    return { ok: true, report: row };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_UPDATE_FAILED" };
  }
}

export async function recordDiscordBugReportStaffMessage(args: {
  reportId: string;
  messageId: string;
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<{ ok: true } | { ok: false; code: "DISCORD_BUG_REPORT_STAFF_MESSAGE_UPDATE_FAILED" }> {
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const { error } = await admin
    .from("discord_feedback_reports")
      .update({
        staff_channel_message_id: args.messageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.reportId);

    if (error) {
      return { ok: false, code: "DISCORD_BUG_REPORT_STAFF_MESSAGE_UPDATE_FAILED" };
    }

    return { ok: true };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_STAFF_MESSAGE_UPDATE_FAILED" };
  }
}

export async function recordDiscordBugReportForumThread(args: {
  reportId: string;
  forumChannelId: string;
  forumThreadId: string;
  forumMessageId: string | null;
  forumTitle?: string | null;
  forumAppliedTagIds?: string[] | null;
  reporterMentionedAt?: string | null;
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<{ ok: true } | { ok: false; code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" }> {
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const { error } = await admin
      .from("discord_feedback_reports")
      .update({
        discord_forum_channel_id: args.forumChannelId,
        discord_forum_thread_id: args.forumThreadId,
        discord_forum_message_id: args.forumMessageId,
        discord_forum_title: args.forumTitle ?? null,
        discord_forum_applied_tag_ids: args.forumAppliedTagIds ?? null,
        reporter_mentioned_at: args.reporterMentionedAt ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.reportId);

    if (error) {
      return { ok: false, code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" };
    }

    return { ok: true };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" };
  }
}

export async function recordDiscordBugReportForumState(args: {
  reportId: string;
  forumTitle: string;
  forumAppliedTagIds: string[] | null;
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<{ ok: true } | { ok: false; code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" }> {
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const { error } = await admin
      .from("discord_feedback_reports")
      .update({
        discord_forum_title: args.forumTitle,
        discord_forum_applied_tag_ids: args.forumAppliedTagIds ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.reportId);

    if (error) {
      return { ok: false, code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" };
    }

    return { ok: true };
  } catch {
    return { ok: false, code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" };
  }
}

export async function withdrawDiscordFeedbackReport(args: {
  reportId: string;
  withdrawnByDiscordUserId: string;
  statusNote?: string | null;
  adminClient?: DiscordBugReportsAdminClient;
  now?: Date;
}): Promise<
  | { ok: true; report: DiscordBugReportRow }
  | { ok: false; code: "DISCORD_FEEDBACK_WITHDRAW_FAILED" | "DISCORD_BUG_REPORT_INVALID_INPUT" }
> {
  if (!isDiscordSnowflake(args.withdrawnByDiscordUserId)) {
    return { ok: false, code: "DISCORD_BUG_REPORT_INVALID_INPUT" };
  }

  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);
  const nowIso = (args.now ?? new Date()).toISOString();
  const statusNote = normalizeTextInput(args.statusNote ?? "Withdrawn by reporter", DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH)
    ?? "Withdrawn by reporter";

  try {
    const { data, error } = await admin
      .from("discord_feedback_reports")
      .update({
        status: "withdrawn",
      details: null,
      steps_to_reproduce: null,
      screenshot_url: null,
      attachment_metadata: null,
      attachment_pruned: true,
      details_pruned: true,
        status_updated_at: nowIso,
        status_updated_by_discord_user_id: args.withdrawnByDiscordUserId,
        status_note: statusNote,
        updated_at: nowIso,
      })
      .eq("id", args.reportId)
      .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
      .single();

    const row = coerceBugReportRow(data);
    if (error || !row) {
      return { ok: false, code: "DISCORD_FEEDBACK_WITHDRAW_FAILED" };
    }

    return { ok: true, report: row };
  } catch {
    return { ok: false, code: "DISCORD_FEEDBACK_WITHDRAW_FAILED" };
  }
}
