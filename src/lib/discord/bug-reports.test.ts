// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordAllowedMentions,
  buildDiscordBugForumDuplicateReply,
  buildDiscordBugForumTagNames,
  buildDiscordBugForumThreadBody,
  buildDiscordBugForumThreadTitle,
  buildDiscordBugReporterLabel,
  buildDiscordBugStatusThreadReply,
  buildDiscordFeedbackWithdrawThreadReply,
  createDiscordBugReport,
  createDiscordBugReportDuplicateFingerprint,
  DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH,
  DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH,
  DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH,
  DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH,
  extractDiscordBugReportModalFields,
  findDiscordBugReportByIdOrPrefix,
  formatDiscordBugReportShortId,
  normalizeDiscordBugReportInput,
  normalizeDiscordBugReportStatus,
  normalizeDiscordBugSeverity,
  normalizeDiscordFeedbackReportType,
  recordDiscordBugReportForumState,
  recordDiscordBugReportForumThread,
  recordDiscordBugReportStaffMessage,
  splitDiscordBugStepsAndScreenshot,
  updateDiscordBugReportStatus,
  withdrawDiscordFeedbackReport,
} from "./bug-reports.ts";
import { extractDiscordModalTextInputValue } from "./interactions.ts";

function buildStoredRow(overrides = {}) {
  return {
    id: "abc12345-ffff-ffff-ffff-ffffffffffff",
    source: "discord",
    report_type: "bug",
    status: "new",
    severity: "medium",
    area: "Settings",
    summary: "Token copy button failed",
    details: "I tapped Copy and nothing happened.",
    steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
    screenshot_url: "https://example.com/shot.png",
    reporter_discord_user_id: "123456789012345678",
    reporter_discord_username: "zac",
    reporter_fitness_user_id: "00000000-0000-0000-0000-000000000123",
    reporter_member_number: 4,
    reporter_user_kind: "human",
    discord_interaction_id: "interaction-1",
    duplicate_fingerprint: "fingerprint-1",
    duplicate_count: 1,
    first_seen_at: "2026-05-15T13:00:00.000Z",
    last_seen_at: "2026-05-15T13:00:00.000Z",
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
    reporter_mentioned_at: null,
    created_at: "2026-05-15T13:00:00.000Z",
    updated_at: "2026-05-15T13:00:00.000Z",
    ...overrides,
  };
}

function createMockAdminClient(options = {}) {
  const reports = [...(options.reports ?? [])];
  const observed = {
    insertedValues: [],
    updatedCalls: [],
  };

  function findMatchingReports(filters = {}) {
    return reports.filter((row) => {
      if (filters.id && row.id !== filters.id) {
        return false;
      }
      if (filters.fingerprint && row.duplicate_fingerprint !== filters.fingerprint) {
        return false;
      }
      if (filters.prefix && !String(row.id).toLowerCase().startsWith(String(filters.prefix).toLowerCase())) {
        return false;
      }
      if (filters.statuses && !filters.statuses.includes(row.status)) {
        return false;
      }
      return true;
    });
  }

  const adminClient = {
    from(table) {
      return {
        select(_columns, selectOptions) {
          if (table === "discord_feedback_reports" && selectOptions?.head) {
            return {
              eq() {
                return {
                  async gte() {
                    return {
                      count: options.recentCount ?? 0,
                      error: null,
                    };
                  },
                };
              },
            };
          }

          if (table === "discord_member_links") {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return {
                      data: options.memberLink ?? null,
                      error: null,
                    };
                  },
                };
              },
            };
          }

          const filters = {
            id: null,
            fingerprint: null,
            prefix: null,
            statuses: null,
          };

          return {
            eq(column, value) {
              if (column === "duplicate_fingerprint") {
                filters.fingerprint = value;
              }
              if (column === "id") {
                filters.id = value;
              }

              return {
                in(statusColumn, statuses) {
                  if (statusColumn === "status") {
                    filters.statuses = statuses;
                  }

                  return {
                    gte() {
                      return {
                        order() {
                          return {
                            limit() {
                              return {
                                async maybeSingle() {
                                  const match = findMatchingReports(filters)[0] ?? null;
                                  return { data: match, error: null };
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
                async maybeSingle() {
                  const match = findMatchingReports(filters)[0] ?? null;
                  return { data: match, error: null };
                },
              };
            },
            ilike(column, value) {
              if (column === "id") {
                filters.prefix = String(value).replace(/%$/, "");
              }

              return {
                async limit(limit) {
                  return {
                    data: findMatchingReports(filters).slice(0, limit),
                    error: null,
                  };
                },
              };
            },
          };
        },
        insert(values) {
          observed.insertedValues.push(values);
          const row = buildStoredRow({
            ...values,
            duplicate_fingerprint: values.duplicate_fingerprint,
            duplicate_count: values.duplicate_count ?? 1,
            first_seen_at: values.first_seen_at ?? "2026-05-15T13:00:00.000Z",
            last_seen_at: values.last_seen_at ?? "2026-05-15T13:00:00.000Z",
          });
          reports.push(row);

          return {
            select() {
              return {
                async single() {
                  return { data: row, error: null };
                },
              };
            },
          };
        },
        update(values) {
          const call = { values, id: null };
          observed.updatedCalls.push(call);

          return {
            eq(_column, id) {
              call.id = id;
              const current = reports.find((row) => row.id === id) ?? buildStoredRow({ id });
              const next = {
                ...current,
                ...values,
              };
              const index = reports.findIndex((row) => row.id === id);
              if (index >= 0) {
                reports[index] = next;
              } else {
                reports.push(next);
              }

              return {
                select() {
                  return {
                    async single() {
                      return { data: next, error: null };
                    },
                  };
                },
                async then(resolve) {
                  return resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  return { adminClient, observed, reports };
}

test("extractDiscordBugReportModalFields maps Discord modal rows into named feedback fields", () => {
  const fields = extractDiscordBugReportModalFields([
    { type: 1, components: [{ type: 4, custom_id: "bug_summary", value: "Copy button failed" }] },
    { type: 1, components: [{ type: 4, custom_id: "bug_area", value: "Settings" }] },
    { type: 1, components: [{ type: 4, custom_id: "bug_severity", value: "High" }] },
    { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
    { type: 1, components: [{ type: 4, custom_id: "bug_steps", value: "Open Settings https://example.com/shot.png" }] },
  ], extractDiscordModalTextInputValue);

  assert.deepEqual(fields, {
    summary: "Copy button failed",
    area: "Settings",
    severity: "High",
    details: "I tapped Copy and nothing happened.",
    stepsAndScreenshot: "Open Settings https://example.com/shot.png",
  });
});

test("normalizeDiscordFeedbackReportType accepts bug feat and fix", () => {
  assert.equal(normalizeDiscordFeedbackReportType("bug"), "bug");
  assert.equal(normalizeDiscordFeedbackReportType("FEAT"), "feat");
  assert.equal(normalizeDiscordFeedbackReportType("fix"), "fix");
  assert.equal(normalizeDiscordFeedbackReportType("other"), null);
});

test("normalizeDiscordBugSeverity maps synonyms and defaults safely", () => {
  assert.equal(normalizeDiscordBugSeverity("HIGH"), "high");
  assert.equal(normalizeDiscordBugSeverity("critical"), "blocker");
  assert.equal(normalizeDiscordBugSeverity("minor"), "low");
  assert.equal(normalizeDiscordBugSeverity("not sure"), "medium");
});

test("buildDiscordBugForumThreadTitle formats bug feat and fix forum titles", () => {
  assert.equal(
    buildDiscordBugForumThreadTitle({
      reportType: "bug",
      area: "account",
      summary: "Copy button does not work",
    }),
    "Bug: Account — Copy button does not work",
  );
  assert.equal(
    buildDiscordBugForumThreadTitle({
      reportType: "feat",
      area: "routines",
      summary: "Let me share a routine",
    }),
    "Feat: Routines — Let me share a routine",
  );
  assert.equal(
    buildDiscordBugForumThreadTitle({
      reportType: "fix",
      area: "session",
      summary: "Rep counter alignment issue",
    }),
    "Fix: Session — Rep counter alignment issue",
  );
});

test("buildDiscordBugForumThreadBody formats the first forum post body with feedback type and reporter mention", () => {
  assert.equal(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "feat",
        id: "abc12345-ffff-ffff-ffff-ffffffffffff",
        screenshot_url: "https://example.com/shot.png",
      }),
      reporterLabel: "Member #4",
    }),
    [
      "**Feedback Report**",
      "Type: Feat",
      "Status: New",
      "Severity: Medium",
      "Area: Settings",
      "Reporter: <@123456789012345678> / Member #4",
      "Report ID: `abc12345`",
      "Duplicate signals: 1",
      "",
      "**Summary**",
      "Token copy button failed",
      "",
      "**What happened**",
      "I tapped Copy and nothing happened.",
      "",
      "**Steps**",
      "Open Settings -> Account -> Generate token -> tap Copy",
      "",
      "**Link / screenshot**",
      "https://example.com/shot.png",
    ].join("\n"),
  );
});

test("buildDiscordBugForumDuplicateReply and withdraw reply stay compact", () => {
  assert.equal(
    buildDiscordBugForumDuplicateReply({
      reporterLabel: "Member #7",
      duplicateCount: 3,
    }),
    "Another report matched this feedback.\nReporter: Member #7\nDuplicate signals: 3",
  );
  assert.equal(buildDiscordFeedbackWithdrawThreadReply(), "This feedback was withdrawn by the reporter.");
});

test("buildDiscordAllowedMentions only includes the reporter user id when requested", () => {
  assert.deepEqual(buildDiscordAllowedMentions({
    reporterDiscordUserId: "123456789012345678",
    includeReporter: true,
  }), {
    parse: [],
    users: ["123456789012345678"],
    roles: [],
    replied_user: false,
  });

  assert.deepEqual(buildDiscordAllowedMentions({
    reporterDiscordUserId: "123456789012345678",
    includeReporter: false,
  }), {
    parse: [],
    users: [],
    roles: [],
    replied_user: false,
  });
});

test("buildDiscordBugForumTagNames applies type status and severity tags including withdrawn", () => {
  assert.deepEqual(buildDiscordBugForumTagNames({
    reportType: "bug",
    status: "new",
    severity: "medium",
  }), ["Bug", "New", "Medium"]);

  assert.deepEqual(buildDiscordBugForumTagNames({
    reportType: "feat",
    status: "withdrawn",
    severity: "high",
  }), ["Feat", "Withdrawn", "High"]);
});

test("buildDiscordBugStatusThreadReply only pings the reporter when explicitly requested", () => {
  assert.equal(
    buildDiscordBugStatusThreadReply({
      status: "needs_info",
      note: "Can you share the exact screen? @everyone",
      reporterDiscordUserId: "123456789012345678",
      includeReporterMention: true,
    }),
    "<@123456789012345678> Status updated: Needs Info\n\nCan you share the exact screen? @\u200beveryone",
  );

  assert.equal(
    buildDiscordBugStatusThreadReply({
      status: "withdrawn",
      note: null,
      reporterDiscordUserId: "123456789012345678",
      includeReporterMention: false,
    }),
    "Status updated: Withdrawn",
  );
});

test("normalizeDiscordBugReportInput trims long summary and long details to bounded lengths", () => {
  const normalized = normalizeDiscordBugReportInput({
    summary: `  ${"S".repeat(DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH + 40)}  `,
    area: " Settings ",
    severity: "high",
    details: `  ${"D".repeat(DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH + 100)}  `,
    stepsAndScreenshot: null,
  }, "feat");

  assert.ok(normalized);
  assert.equal(normalized?.summary.length, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH);
  assert.equal(normalized?.details.length, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);
  assert.equal(normalized?.area, "Settings");
  assert.equal(normalized?.reportType, "feat");
});

test("normalizeDiscordBugReportInput rejects empty summary or details after trimming", () => {
  assert.equal(normalizeDiscordBugReportInput({
    summary: "   ",
    area: "Settings",
    severity: "medium",
    details: "Something failed",
    stepsAndScreenshot: null,
  }), null);

  assert.equal(normalizeDiscordBugReportInput({
    summary: "Something failed",
    area: "Settings",
    severity: "medium",
    details: "   ",
    stepsAndScreenshot: null,
  }), null);
});

test("splitDiscordBugStepsAndScreenshot stores only an external screenshot URL and bounds it", () => {
  const longUrl = `https://example.com/${"a".repeat(DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH + 20)}`;

  assert.deepEqual(splitDiscordBugStepsAndScreenshot(`Steps first ${longUrl}`), {
    steps: "Steps first",
    screenshotUrl: null,
  });

  assert.deepEqual(splitDiscordBugStepsAndScreenshot("Open Settings then check data:image/png;base64,abcdef"), {
    steps: "Open Settings then check data:image/png;base64,abcdef",
    screenshotUrl: null,
  });
});

test("createDiscordBugReport rejects invalid reporter ids", async () => {
  const { adminClient } = createMockAdminClient();
  const result = await createDiscordBugReport({
    interactionId: "interaction-1",
    reporterDiscordUserId: "not-a-snowflake",
    reporterDiscordUsername: "zac",
    modalFields: {
      summary: "Copy failed",
      area: "Settings",
      severity: "medium",
      details: "Something failed",
      stepsAndScreenshot: null,
    },
    adminClient,
  });

  assert.deepEqual(result, {
    ok: false,
    code: "DISCORD_BUG_REPORT_INVALID_INPUT",
  });
});

test("createDiscordBugReport rate limits repeated submissions inside the time window", async () => {
  const { adminClient } = createMockAdminClient({ recentCount: 3 });
  const result = await createDiscordBugReport({
    interactionId: "interaction-1",
    reporterDiscordUserId: "123456789012345678",
    reporterDiscordUsername: "zac",
    modalFields: {
      summary: "Copy failed",
      area: "Settings",
      severity: "medium",
      details: "Something failed",
      stepsAndScreenshot: null,
    },
    adminClient,
  });

  assert.deepEqual(result, {
    ok: false,
    code: "DISCORD_BUG_REPORT_RATE_LIMITED",
  });
});

test("createDiscordBugReport uses a deterministic duplicate fingerprint that includes report type", async () => {
  const { adminClient, observed } = createMockAdminClient({
    memberLink: {
      fitness_user_id: "00000000-0000-0000-0000-000000000123",
      user_number: 4,
      user_kind: "human",
    },
  });
  const result = await createDiscordBugReport({
    interactionId: "interaction-1",
    reporterDiscordUserId: "123456789012345678",
    reporterDiscordUsername: "zac",
    reportType: "feat",
    modalFields: {
      summary: "Token button didn't copy",
      area: "Settings",
      severity: "medium",
      details: "I tapped Copy and nothing happened.",
      stepsAndScreenshot: "Open Settings -> Account -> Generate token -> tap Copy https://example.com/shot.png",
    },
    adminClient,
    now: new Date("2026-05-15T13:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.duplicate, false);
  assert.equal(result.report.report_type, "feat");
  assert.equal(
    observed.insertedValues[0]?.duplicate_fingerprint,
    createDiscordBugReportDuplicateFingerprint({
      reportType: "feat",
      area: "Settings",
      summary: "Token button didn't copy",
    }),
  );
});

test("createDiscordBugReport folds duplicates into an existing row instead of inserting again", async () => {
  const existingDuplicate = buildStoredRow({
    id: "existing-report",
    duplicate_fingerprint: createDiscordBugReportDuplicateFingerprint({
      reportType: "bug",
      area: "Settings",
      summary: "Token button didn't copy",
    }),
    duplicate_count: 2,
    reporter_discord_username: null,
    reporter_member_number: null,
    reporter_fitness_user_id: null,
    reporter_user_kind: null,
  });
  const { adminClient, observed } = createMockAdminClient({
    recentCount: 0,
    memberLink: {
      fitness_user_id: "00000000-0000-0000-0000-000000000123",
      user_number: 4,
      user_kind: "human",
    },
    reports: [existingDuplicate],
  });

  const result = await createDiscordBugReport({
    interactionId: "interaction-2",
    reporterDiscordUserId: "999999999999999999",
    reporterDiscordUsername: "new-zac",
    reportType: "bug",
    modalFields: {
      summary: "Token button didn't copy",
      area: "Settings",
      severity: "high",
      details: "Different details that should not be stored again.",
      stepsAndScreenshot: "Different steps https://example.com/second.png",
    },
    adminClient,
    now: new Date("2026-05-15T14:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.duplicate, true);
  assert.equal(result.report.id, "existing-report");
  assert.equal(observed.insertedValues.length, 0);
  assert.equal(observed.updatedCalls[0]?.values?.duplicate_count, 3);
});

test("findDiscordBugReportByIdOrPrefix resolves a unique short id and rejects ambiguous prefixes", async () => {
  const reportOne = buildStoredRow({ id: "abcd1234-ffff-ffff-ffff-ffffffffffff" });
  const reportTwo = buildStoredRow({ id: "abcd9876-ffff-ffff-ffff-ffffffffffff", summary: "Another report" });
  const unique = createMockAdminClient({ reports: [reportOne] });
  const ambiguous = createMockAdminClient({ reports: [reportOne, reportTwo] });

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "abcd1234",
      adminClient: unique.adminClient,
    }),
    { ok: true, report: reportOne },
  );

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "abcd",
      adminClient: ambiguous.adminClient,
    }),
    { ok: false, code: "DISCORD_BUG_REPORT_AMBIGUOUS_ID" },
  );
});

test("updateDiscordBugReportStatus stores status metadata and trims long notes", async () => {
  const report = buildStoredRow({ id: "report-1" });
  const { adminClient } = createMockAdminClient({ reports: [report] });
  const result = await updateDiscordBugReportStatus({
    reportId: "report-1",
    status: "needs_info",
    note: ` ${"N".repeat(DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH + 50)} `,
    updatedByDiscordUserId: "123456789012345678",
    adminClient,
    now: new Date("2026-05-15T14:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.report.status, "needs_info");
  assert.equal(result.report.status_note.length, DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH);
});

test("withdrawDiscordFeedbackReport redacts details and marks withdrawn", async () => {
  const report = buildStoredRow({ id: "report-1" });
  const { adminClient } = createMockAdminClient({ reports: [report] });
  const result = await withdrawDiscordFeedbackReport({
    reportId: "report-1",
    withdrawnByDiscordUserId: "123456789012345678",
    adminClient,
    now: new Date("2026-05-15T14:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.report.status, "withdrawn");
  assert.equal(result.report.details, null);
  assert.equal(result.report.steps_to_reproduce, null);
  assert.equal(result.report.screenshot_url, null);
  assert.equal(result.report.details_pruned, true);
});

test("recordDiscordBugReportStaffMessage stores the notification message id", async () => {
  const { adminClient, observed } = createMockAdminClient({ reports: [buildStoredRow({ id: "report-1" })] });
  const result = await recordDiscordBugReportStaffMessage({
    reportId: "report-1",
    messageId: "discord-message-1",
    adminClient,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(observed.updatedCalls[0]?.values?.staff_channel_message_id, "discord-message-1");
});

test("recordDiscordBugReportForumThread stores the linked forum thread ids and title metadata", async () => {
  const { adminClient, observed } = createMockAdminClient({ reports: [buildStoredRow({ id: "report-1" })] });
  const result = await recordDiscordBugReportForumThread({
    reportId: "report-1",
    forumChannelId: "1504673475489562744",
    forumThreadId: "1504673475489562745",
    forumMessageId: "1504673475489562746",
    forumTitle: "Bug: Settings — Copy button does not work",
    forumAppliedTagIds: ["tag-bug", "tag-new", "tag-medium"],
    reporterMentionedAt: "2026-05-15T13:01:00.000Z",
    adminClient,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(observed.updatedCalls[0]?.values?.discord_forum_thread_id, "1504673475489562745");
  assert.deepEqual(observed.updatedCalls[0]?.values?.discord_forum_applied_tag_ids, ["tag-bug", "tag-new", "tag-medium"]);
});

test("recordDiscordBugReportForumState stores title and tag sync state", async () => {
  const { adminClient, observed } = createMockAdminClient({ reports: [buildStoredRow({ id: "report-1" })] });
  const result = await recordDiscordBugReportForumState({
    reportId: "report-1",
    forumTitle: "Bug: Settings — Copy button does not work",
    forumAppliedTagIds: ["tag-bug", "tag-withdrawn", "tag-medium"],
    adminClient,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(observed.updatedCalls[0]?.values?.discord_forum_title, "Bug: Settings — Copy button does not work");
});

test("small helper formatters keep forum-safe ids and reporter labels", () => {
  assert.equal(formatDiscordBugReportShortId("abc12345-ffff-ffff-ffff-ffffffffffff"), "abc12345");
  assert.equal(normalizeDiscordBugReportStatus("withdrawn"), "withdrawn");
  assert.equal(buildDiscordBugReporterLabel({
    reporterDiscordUsername: "zac",
    reporterMemberNumber: 4,
  }), "Member #4");
});
