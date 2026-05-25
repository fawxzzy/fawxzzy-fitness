import assert from "node:assert/strict";
import test from "node:test";

import type { DiscordBugReportRow } from "@/lib/discord/bug-reports";
import {
  appendDiscordFeedbackWarning,
  canAccessAnyFeedbackReport,
  isResolvedFeedbackStatus,
  resolveDiscordFeedbackLookupFailureMessage,
  resolveFirstDiscordComponentValue,
  resolveSubmitPickerReportTypeFromValues,
  shouldArchiveFeedbackThread,
  summarizeFeedbackContentChanges,
} from "@/lib/discord/runtime/feedback/helpers";

function createFeedbackReport(overrides: Partial<DiscordBugReportRow> = {}): DiscordBugReportRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "discord",
    report_type: "bug",
    status: "new",
    severity: "medium",
    effort_points: 3,
    area: "Settings",
    summary: "Initial summary",
    details: "Initial details",
    steps_to_reproduce: "Initial steps",
    screenshot_url: null,
    attachment_count: 0,
    attachment_metadata: null,
    attachment_pruned: false,
    reporter_discord_user_id: "123456789012345678",
    reporter_discord_username: "fawxzzy",
    reporter_fitness_user_id: null,
    reporter_member_number: null,
    reporter_user_kind: "human",
    discord_interaction_id: null,
    duplicate_fingerprint: null,
    duplicate_count: 0,
    first_seen_at: "2026-05-25T00:00:00.000Z",
    last_seen_at: "2026-05-25T00:00:00.000Z",
    discord_forum_channel_id: null,
    discord_forum_thread_id: null,
    discord_forum_message_id: null,
    discord_forum_applied_tag_ids: null,
    discord_forum_title: null,
    staff_channel_message_id: null,
    closed_at: null,
    pruned_at: null,
    details_pruned: false,
    triage_notes: null,
    status_updated_at: null,
    status_updated_by_discord_user_id: null,
    status_note: null,
    completion_review_status: "not_required",
    completion_reviewed_at: null,
    completion_reviewed_by_discord_user_id: null,
    completion_review_note: null,
    reporter_mentioned_at: null,
    created_at: "2026-05-25T00:00:00.000Z",
    updated_at: "2026-05-25T00:00:00.000Z",
    ...overrides,
  };
}

test("feedback runtime helpers normalize lifecycle status checks", () => {
  assert.equal(shouldArchiveFeedbackThread("duplicate"), true);
  assert.equal(shouldArchiveFeedbackThread("withdrawn"), true);
  assert.equal(shouldArchiveFeedbackThread("fixed"), false);
  assert.equal(isResolvedFeedbackStatus("fixed"), true);
  assert.equal(isResolvedFeedbackStatus("closed"), true);
  assert.equal(isResolvedFeedbackStatus("new"), false);
});

test("feedback runtime helpers resolve lookup failures and warnings", () => {
  assert.match(resolveDiscordFeedbackLookupFailureMessage("DISCORD_BUG_REPORT_AMBIGUOUS_ID"), /matched multiple feedback reports/i);
  assert.match(resolveDiscordFeedbackLookupFailureMessage("anything-else"), /could not find that feedback report/i);
  assert.equal(appendDiscordFeedbackWarning("Feedback updated.", null), "Feedback updated.");
  assert.equal(appendDiscordFeedbackWarning("Feedback updated.", "Forum sync failed."), "Feedback updated. Warning: Forum sync failed.");
});

test("feedback runtime helpers summarize changed feedback card fields", () => {
  const before = createFeedbackReport();
  const after = createFeedbackReport({
    area: "Community",
    details: "Updated details",
  });

  assert.equal(summarizeFeedbackContentChanges({ before, after }), "Edited fields: Area, Description.");
  assert.equal(summarizeFeedbackContentChanges({ before, after: before }), "Card content refreshed.");
});

test("feedback runtime helpers read picker values and enforce known report types", () => {
  assert.equal(resolveFirstDiscordComponentValue(["feature"]), "feature");
  assert.equal(resolveFirstDiscordComponentValue(["bug"]), "bug");
  assert.equal(resolveFirstDiscordComponentValue([42]), null);
  assert.equal(resolveSubmitPickerReportTypeFromValues(["feature"]), "feature");
  assert.equal(resolveSubmitPickerReportTypeFromValues(["unknown"]), "bug");
});

test("feedback runtime helpers preserve current staff permission checks", () => {
  assert.equal(canAccessAnyFeedbackReport("32"), true);
  assert.equal(canAccessAnyFeedbackReport(null), false);
});
