import "server-only";

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DiscordAllowedMentions } from "@/lib/discord/rest";

export const DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH = 120;
export const DISCORD_BUG_REPORT_AREA_MAX_LENGTH = 80;
export const DISCORD_BUG_REPORT_SEVERITY_MAX_LENGTH = 20;
export const DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH = 1200;
export const DISCORD_BUG_REPORT_STEPS_MAX_LENGTH = 1200;
export const DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH = 500;
export const DISCORD_BUG_REPORT_FORUM_TITLE_MAX_LENGTH = 100;
export const DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH = 1000;
export const DISCORD_BUG_REPORT_RATE_LIMIT_WINDOW_MINUTES = 10;
export const DISCORD_BUG_REPORT_RATE_LIMIT_MAX_REPORTS = 3;
export const DISCORD_BUG_REPORT_DUPLICATE_WINDOW_DAYS = 30;
export const DISCORD_BUG_REPORT_DUPLICATE_ACTIVE_STATUSES = ["new", "needs_info", "confirmed", "in_progress"] as const;
export const DISCORD_BUG_REPORT_TYPE_TAG_LABELS = {
  bug: "Bug",
  feat: "Feat",
  fix: "Fix",
} as const;
export const DISCORD_BUG_REPORT_STATUS_TAG_LABELS = {
  new: "New",
  needs_info: "Needs Info",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  fixed: "Fixed",
  closed: "Closed",
  duplicate: "Duplicate",
  spam: "Spam",
  withdrawn: "Withdrawn",
} as const;

export type DiscordBugReportSeverity = "low" | "medium" | "high" | "blocker";
export type DiscordBugReportStatus = keyof typeof DISCORD_BUG_REPORT_STATUS_TAG_LABELS;
export type DiscordBugReportReportType = keyof typeof DISCORD_BUG_REPORT_TYPE_TAG_LABELS;
export type DiscordBugReportReporterUserKind = "human" | "automation" | "unknown";

export type DiscordBugReportModalFields = {
  summary: string | null;
  area: string | null;
  severity: string | null;
  details: string | null;
  stepsAndScreenshot: string | null;
};

export type DiscordBugReportStatusUpdate = {
  reportIdOrPrefix: string;
  status: DiscordBugReportStatus;
  note: string | null;
  updatedByDiscordUserId: string;
  updatedAt?: Date;
};

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
  area: string | null;
  summary: string;
  details: string | null;
  steps_to_reproduce: string | null;
  screenshot_url: string | null;
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
  reporter_mentioned_at: string | null;
  created_at: string;
  updated_at: string;
};

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
};

const DISCORD_BUG_REPORT_SELECT_COLUMNS = [
  "id",
  "source",
  "report_type",
  "status",
  "severity",
  "area",
  "summary",
  "details",
  "steps_to_reproduce",
  "screenshot_url",
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

function neutralizeDiscordMentions(value: string): string {
  return value
    .replace(/@everyone/gi, "@\u200beveryone")
    .replace(/@here/gi, "@\u200bhere")
    .replace(/<@&/g, "<@\u200b&")
    .replace(/<@/g, "<@\u200b");
}

function isDiscordSnowflake(value: string): boolean {
  return /^[0-9]{1,32}$/.test(value);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isShortReportIdPrefix(value: string): boolean {
  return /^[0-9a-f]{4,12}$/i.test(value);
}

function coerceUserKind(value: unknown): DiscordBugReportReporterUserKind | null {
  return value === "human" || value === "automation" || value === "unknown" ? value : null;
}

function coerceBugReportStatus(value: unknown): DiscordBugReportStatus | null {
  return typeof value === "string" && value in DISCORD_BUG_REPORT_STATUS_TAG_LABELS
    ? value as DiscordBugReportStatus
    : null;
}

function coerceBugReportReportType(value: unknown): DiscordBugReportReportType | null {
  return typeof value === "string" && value in DISCORD_BUG_REPORT_TYPE_TAG_LABELS
    ? value as DiscordBugReportReportType
    : null;
}

function coerceBugReportSeverity(value: unknown): DiscordBugReportSeverity | null {
  return value === "low" || value === "medium" || value === "high" || value === "blocker"
    ? value
    : null;
}

function coerceBugReportRow(data: Record<string, unknown> | null | undefined): DiscordBugReportRow | null {
  if (!data || typeof data.id !== "string") {
    return null;
  }

  const reportType = coerceBugReportReportType(data.report_type);
  const status = coerceBugReportStatus(data.status);
  const severity = coerceBugReportSeverity(data.severity);
  if (!reportType || !status || !severity || typeof data.summary !== "string" || typeof data.reporter_discord_user_id !== "string") {
    return null;
  }

  return {
    id: data.id,
    source: "discord",
    report_type: reportType,
    status,
    severity,
    area: typeof data.area === "string" ? data.area : null,
    summary: data.summary,
    details: typeof data.details === "string" ? data.details : null,
    steps_to_reproduce: typeof data.steps_to_reproduce === "string" ? data.steps_to_reproduce : null,
    screenshot_url: typeof data.screenshot_url === "string" ? data.screenshot_url : null,
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
    reporter_mentioned_at: typeof data.reporter_mentioned_at === "string" ? data.reporter_mentioned_at : null,
    created_at: typeof data.created_at === "string" ? data.created_at : new Date(0).toISOString(),
    updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date(0).toISOString(),
  };
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

export function formatDiscordBugReportStatusLabel(status: DiscordBugReportStatus): string {
  return DISCORD_BUG_REPORT_STATUS_TAG_LABELS[status];
}

export function formatDiscordBugReportTypeLabel(reportType: DiscordBugReportReportType): string {
  return DISCORD_BUG_REPORT_TYPE_TAG_LABELS[reportType];
}

export function normalizeDiscordFeedbackReportType(value: string | null | undefined): DiscordBugReportReportType | null {
  const normalized = normalizeTextInput(value, 20)?.toLowerCase();
  return normalized === "bug" || normalized === "feat" || normalized === "fix" ? normalized : null;
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
}): string[] {
  const names = [
    formatDiscordBugReportTypeLabel(args.reportType),
    formatDiscordBugReportStatusLabel(args.status),
  ];

  if (args.status !== "spam") {
    names.push(formatForumSeverityLabel(args.severity));
  }

  return [...new Set(names)].slice(0, 3);
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

export function buildDiscordBugForumThreadBody(args: {
  report: DiscordBugReportRow;
  reporterLabel: string;
}): string {
  const reporterLine = buildDiscordBugReporterMention({
    reporterDiscordUserId: args.report.reporter_discord_user_id,
    reporterLabel: args.reporterLabel,
  });

  return [
    "**Feedback Report**",
    `Type: ${formatDiscordBugReportTypeLabel(args.report.report_type)}`,
    `Status: ${formatDiscordBugReportStatusLabel(args.report.status)}`,
    `Severity: ${formatForumSeverityLabel(args.report.severity)}`,
    `Area: ${formatForumAreaLabel(args.report.area)}`,
    `Reporter: ${reporterLine}`,
    `Report ID: \`${formatDiscordBugReportShortId(args.report.id)}\``,
    `Duplicate signals: ${Math.max(1, Number(args.report.duplicate_count ?? 1))}`,
    "",
    "**Summary**",
    renderForumBodyValue(args.report.summary, "Not provided"),
    "",
    "**What happened**",
    renderForumBodyValue(args.report.details, "Not provided"),
    "",
    "**Steps**",
    renderForumBodyValue(args.report.steps_to_reproduce, "Not provided"),
    "",
    "**Link / screenshot**",
    renderForumBodyValue(args.report.screenshot_url, "Not provided"),
  ].join("\n");
}

export function buildDiscordBugForumDuplicateReply(args: {
  reporterLabel: string;
  duplicateCount: number;
}): string {
  return [
    "Another report matched this feedback.",
    `Reporter: ${args.reporterLabel}`,
    `Duplicate signals: ${Math.max(1, Number(args.duplicateCount ?? 1))}`,
  ].join("\n");
}

export function buildDiscordFeedbackWithdrawThreadReply(): string {
  return "This feedback was withdrawn by the reporter.";
}

export function buildDiscordBugStatusThreadReply(args: {
  status: DiscordBugReportStatus;
  note: string | null;
  reporterDiscordUserId: string | null;
  includeReporterMention: boolean;
}): string {
  const prefix = args.includeReporterMention && args.reporterDiscordUserId
    ? `<@${args.reporterDiscordUserId}> `
    : "";
  const lines = [`${prefix}Status updated: ${formatDiscordBugReportStatusLabel(args.status)}`];

  if (args.note) {
    lines.push("", neutralizeDiscordMentions(args.note));
  }

  return lines.join("\n");
}

export function extractDiscordBugReportModalFields(
  components: unknown,
  readField: (components: unknown, inputCustomId: string) => string | null,
): DiscordBugReportModalFields {
  return {
    summary: readField(components, "bug_summary"),
    area: readField(components, "bug_area"),
    severity: readField(components, "bug_severity"),
    details: readField(components, "bug_details"),
    stepsAndScreenshot: readField(components, "bug_steps"),
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
  const normalizedArea = normalizeTextInput(args.area, DISCORD_BUG_REPORT_AREA_MAX_LENGTH)?.toLowerCase() ?? "";
  const normalizedSummary = normalizeTextInput(args.summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH)?.toLowerCase() ?? "";

  return createHash("sha256")
    .update(`${args.reportType}::${normalizedArea}::${normalizedSummary}`)
    .digest("hex");
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
  const splitFields = splitDiscordBugStepsAndScreenshot(modalFields.stepsAndScreenshot);

  return {
    reportType,
    area,
    severity: normalizeDiscordBugSeverity(modalFields.severity),
    summary,
    details,
    stepsToReproduce: splitFields.steps,
    screenshotUrl: splitFields.screenshotUrl,
    duplicateFingerprint: createDiscordBugReportDuplicateFingerprint({
      reportType,
      area,
      summary,
    }),
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
  duplicateFingerprint: string;
  now: Date;
}): Promise<DiscordBugReportRow | null> {
  const { data, error } = await args.admin
    .from("discord_feedback_reports")
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .eq("duplicate_fingerprint", args.duplicateFingerprint)
    .in("status", [...DISCORD_BUG_REPORT_DUPLICATE_ACTIVE_STATUSES])
    .gte("last_seen_at", buildDuplicateLookupCutoff(args.now))
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up duplicate discord bug report: ${error.message}`);
  }

  return coerceBugReportRow(data);
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
  const { data, error } = await args.admin
    .from("discord_feedback_reports")
    .update({
      duplicate_count: Math.max(1, Number(args.existingReport.duplicate_count ?? 1)) + 1,
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

async function findDiscordBugReportByShortId(admin: DiscordBugReportsAdminClient, shortId: string): Promise<DiscordBugReportRow | null> {
  const { data, error } = await admin
    .from("discord_feedback_reports")
    .select(DISCORD_BUG_REPORT_SELECT_COLUMNS)
    .ilike("id", `${shortId}%`)
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
      duplicateFingerprint: normalizedInput.duplicateFingerprint,
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
      area: normalizedInput.area,
      summary: normalizedInput.summary,
      details: normalizedInput.details,
      steps_to_reproduce: normalizedInput.stepsToReproduce,
      screenshot_url: normalizedInput.screenshotUrl,
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

    if (!isShortReportIdPrefix(normalized)) {
      return { ok: false, code: "DISCORD_BUG_REPORT_NOT_FOUND" };
    }

    const report = await findDiscordBugReportByShortId(admin, normalized);
    return report
      ? { ok: true, report }
      : { ok: false, code: "DISCORD_BUG_REPORT_NOT_FOUND" };
  } catch (error) {
    if (error instanceof Error && error.message === "Discord bug report short id matched multiple rows.") {
      return { ok: false, code: "DISCORD_BUG_REPORT_AMBIGUOUS_ID" };
    }

    return { ok: false, code: "DISCORD_BUG_REPORT_LOOKUP_FAILED" };
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

  try {
    const { data, error } = await admin
      .from("discord_feedback_reports")
      .update({
        status: "withdrawn",
        details: null,
        steps_to_reproduce: null,
        screenshot_url: null,
        details_pruned: true,
        status_updated_at: nowIso,
        status_updated_by_discord_user_id: args.withdrawnByDiscordUserId,
        status_note: "Withdrawn by reporter",
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
