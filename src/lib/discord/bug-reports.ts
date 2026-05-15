import "server-only";

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH = 120;
export const DISCORD_BUG_REPORT_AREA_MAX_LENGTH = 80;
export const DISCORD_BUG_REPORT_SEVERITY_MAX_LENGTH = 20;
export const DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH = 1200;
export const DISCORD_BUG_REPORT_STEPS_MAX_LENGTH = 1200;
export const DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH = 500;
export const DISCORD_BUG_REPORT_RATE_LIMIT_WINDOW_MINUTES = 10;
export const DISCORD_BUG_REPORT_RATE_LIMIT_MAX_REPORTS = 3;
export const DISCORD_BUG_REPORT_DUPLICATE_WINDOW_DAYS = 30;
export const DISCORD_BUG_REPORT_DUPLICATE_ACTIVE_STATUSES = ["new", "triaged", "accepted"] as const;

export type DiscordBugReportSeverity = "low" | "medium" | "high" | "blocker";
export type DiscordBugReportStatus = "new" | "triaged" | "accepted" | "duplicate" | "closed" | "spam";
export type DiscordBugReportReporterUserKind = "human" | "automation" | "unknown";

export type DiscordBugReportModalFields = {
  summary: string | null;
  area: string | null;
  severity: string | null;
  details: string | null;
  stepsAndScreenshot: string | null;
};

export type DiscordBugReporterLink = {
  fitnessUserId: string | null;
  memberNumber: number | null;
  userKind: DiscordBugReportReporterUserKind | null;
};

export type DiscordBugReportRow = {
  id: string;
  source: "discord";
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
  staff_channel_message_id: string | null;
  closed_at: string | null;
  pruned_at: string | null;
  details_pruned: boolean;
  triage_notes: string | null;
  created_at: string;
  updated_at: string;
};

type DiscordBugReportsAdminClient = {
  from: (table: "discord_bug_reports" | "discord_member_links") => any;
};

type NormalizedDiscordBugReportInput = {
  area: string | null;
  severity: DiscordBugReportSeverity;
  summary: string;
  details: string;
  stepsToReproduce: string | null;
  screenshotUrl: string | null;
  duplicateFingerprint: string;
};

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

function isDiscordSnowflake(value: string): boolean {
  return /^[0-9]{1,32}$/.test(value);
}

function coerceUserKind(value: unknown): DiscordBugReportReporterUserKind | null {
  return value === "human" || value === "automation" || value === "unknown" ? value : null;
}

function coerceBugReportRow(data: Record<string, unknown> | null | undefined): DiscordBugReportRow | null {
  if (!data || typeof data.id !== "string") {
    return null;
  }

  return data as unknown as DiscordBugReportRow;
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

function formatForumSeverityLabel(severity: DiscordBugReportSeverity): string {
  return formatTitleCase(severity);
}

export function formatDiscordBugReportShortId(reportId: string): string {
  const normalized = String(reportId ?? "").trim();
  if (!normalized) {
    return "unknown";
  }

  return normalized.split("-")[0]?.slice(0, 8) ?? normalized.slice(0, 8);
}

function formatForumSummary(summary: string): string {
  return normalizeTextInput(summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH)?.replace(/\s+/g, " ") ?? "Untitled bug";
}

export function buildDiscordBugForumThreadTitle(args: {
  severity: DiscordBugReportSeverity;
  area: string | null;
  summary: string;
}): string {
  return `[Bug][${formatForumSeverityLabel(args.severity)}] ${formatForumAreaLabel(args.area)} — ${formatForumSummary(args.summary)}`;
}

export function buildDiscordBugForumThreadBody(args: {
  report: DiscordBugReportRow;
  reporterLabel: string;
}): string {
  return [
    "**Bug Report**",
    `Status: ${formatTitleCase(args.report.status)}`,
    `Severity: ${formatForumSeverityLabel(args.report.severity)}`,
    `Area: ${formatForumAreaLabel(args.report.area)}`,
    `Reporter: ${args.reporterLabel}`,
    `Report ID: \`${formatDiscordBugReportShortId(args.report.id)}\``,
    `Duplicate signals: ${Math.max(1, Number(args.report.duplicate_count ?? 1))}`,
    "",
    "**Summary**",
    args.report.summary,
    "",
    "**What happened**",
    args.report.details ?? "Not provided",
    "",
    "**Steps**",
    args.report.steps_to_reproduce ?? "Not provided",
    "",
    "**Link / screenshot**",
    args.report.screenshot_url ?? "Not provided",
  ].join("\n");
}

export function buildDiscordBugForumDuplicateReply(args: {
  reporterLabel: string;
  duplicateCount: number;
}): string {
  return [
    "Another report matched this bug.",
    `Reporter: ${args.reporterLabel}`,
    `Duplicate signals: ${Math.max(1, Number(args.duplicateCount ?? 1))}`,
  ].join("\n");
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
  area: string | null;
  summary: string;
}): string {
  const normalizedArea = normalizeTextInput(args.area, DISCORD_BUG_REPORT_AREA_MAX_LENGTH)?.toLowerCase() ?? "";
  const normalizedSummary = normalizeTextInput(args.summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH)?.toLowerCase() ?? "";

  return createHash("sha256")
    .update(`${normalizedArea}::${normalizedSummary}`)
    .digest("hex");
}

export function normalizeDiscordBugReportInput(modalFields: DiscordBugReportModalFields): NormalizedDiscordBugReportInput | null {
  const summary = normalizeTextInput(modalFields.summary, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH);
  const details = normalizeTextInput(modalFields.details, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);
  if (!summary || !details) {
    return null;
  }

  const area = normalizeTextInput(modalFields.area, DISCORD_BUG_REPORT_AREA_MAX_LENGTH);
  const splitFields = splitDiscordBugStepsAndScreenshot(modalFields.stepsAndScreenshot);

  return {
    area,
    severity: normalizeDiscordBugSeverity(modalFields.severity),
    summary,
    details,
    stepsToReproduce: splitFields.steps,
    screenshotUrl: splitFields.screenshotUrl,
    duplicateFingerprint: createDiscordBugReportDuplicateFingerprint({
      area,
      summary,
    }),
  };
}

async function countRecentDiscordBugReports(admin: DiscordBugReportsAdminClient, reporterDiscordUserId: string, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - DISCORD_BUG_REPORT_RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await admin
    .from("discord_bug_reports")
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
    .from("discord_bug_reports")
    .select([
      "id",
      "source",
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
      "staff_channel_message_id",
      "closed_at",
      "pruned_at",
      "details_pruned",
      "triage_notes",
      "created_at",
      "updated_at",
    ].join(", "))
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
    .from("discord_bug_reports")
    .insert(values)
    .select([
      "id",
      "source",
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
      "staff_channel_message_id",
      "closed_at",
      "pruned_at",
      "details_pruned",
      "triage_notes",
      "created_at",
      "updated_at",
    ].join(", "))
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
    .from("discord_bug_reports")
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
    .select([
      "id",
      "source",
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
      "staff_channel_message_id",
      "closed_at",
      "pruned_at",
      "details_pruned",
      "triage_notes",
      "created_at",
      "updated_at",
    ].join(", "))
    .single();

  const row = coerceBugReportRow(data);
  if (error || !row) {
    throw new Error(`Failed to update duplicate discord bug report: ${error?.message ?? "missing row"}`);
  }

  return row;
}

export async function createDiscordBugReport(args: {
  interactionId: string | null;
  reporterDiscordUserId: string;
  reporterDiscordUsername: string | null;
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

  const normalizedInput = normalizeDiscordBugReportInput(args.modalFields);
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

export async function recordDiscordBugReportStaffMessage(args: {
  reportId: string;
  messageId: string;
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<{ ok: true } | { ok: false; code: "DISCORD_BUG_REPORT_STAFF_MESSAGE_UPDATE_FAILED" }> {
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const { error } = await admin
      .from("discord_bug_reports")
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
  adminClient?: DiscordBugReportsAdminClient;
}): Promise<{ ok: true } | { ok: false; code: "DISCORD_BUG_REPORT_FORUM_THREAD_UPDATE_FAILED" }> {
  const admin = args.adminClient ?? (supabaseAdmin() as unknown as DiscordBugReportsAdminClient);

  try {
    const { error } = await admin
      .from("discord_bug_reports")
      .update({
        discord_forum_channel_id: args.forumChannelId,
        discord_forum_thread_id: args.forumThreadId,
        discord_forum_message_id: args.forumMessageId,
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
