import {
  normalizeDiscordFeedbackReportType,
  type DiscordBugReportRow,
} from "@/lib/discord/bug-reports";
import { discordMemberHasBugStatusPermission } from "@/lib/discord/interactions";

export function shouldArchiveFeedbackThread(status: string): boolean {
  return status === "duplicate" || status === "withdrawn";
}

export function isResolvedFeedbackStatus(status: string): boolean {
  return status === "fixed" || status === "closed";
}

export function canAccessAnyFeedbackReport(permissions: string | null): boolean {
  return discordMemberHasBugStatusPermission(permissions);
}

export function resolveDiscordFeedbackLookupFailureMessage(code: string): string {
  if (code === "DISCORD_BUG_REPORT_AMBIGUOUS_ID") {
    return "That report id matched multiple feedback reports. Copy the full Report ID from the forum post.";
  }

  return "Could not find that feedback report. Copy the Report ID from the forum post and try again.";
}

export function appendDiscordFeedbackWarning(baseMessage: string, warning: string | null): string {
  if (!warning) {
    return baseMessage;
  }

  return `${baseMessage} Warning: ${warning}`;
}

export function summarizeFeedbackContentChanges(args: {
  before: DiscordBugReportRow;
  after: DiscordBugReportRow;
}): string {
  const changedFields: string[] = [];
  if ((args.before.summary ?? "") !== (args.after.summary ?? "")) {
    changedFields.push("Title");
  }
  if ((args.before.area ?? "") !== (args.after.area ?? "")) {
    changedFields.push("Area");
  }
  if ((args.before.details ?? "") !== (args.after.details ?? "")) {
    changedFields.push("Description");
  }
  if ((args.before.steps_to_reproduce ?? "") !== (args.after.steps_to_reproduce ?? "")) {
    changedFields.push("Card Sections");
  }

  return changedFields.length > 0 ? `Edited fields: ${changedFields.join(", ")}.` : "Card content refreshed.";
}

export function resolveFirstDiscordComponentValue(values: unknown): string | null {
  return Array.isArray(values) && typeof values[0] === "string"
    ? values[0]
    : null;
}

export function resolveSubmitPickerReportTypeFromValues(values: unknown): "bug" | "feature" {
  const selectedType = resolveFirstDiscordComponentValue(values);
  const normalizedType = normalizeDiscordFeedbackReportType(selectedType);
  return normalizedType === "feature" ? "feature" : "bug";
}
