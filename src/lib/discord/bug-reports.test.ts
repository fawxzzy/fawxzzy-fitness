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
  DISCORD_BUG_REPORT_FORUM_BODY_MAX_LENGTH,
  DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH,
  DISCORD_BUG_REPORT_STATUS_NOTE_MAX_LENGTH,
  DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH,
  extractDiscordBugReportModalFields,
  estimateDiscordFeedbackEffortPoints,
  findDiscordBugReportByIdOrPrefix,
  formatDiscordBugReportShortId,
  normalizeDiscordBugReportInput,
  normalizeDiscordBugReportStatus,
  normalizeDiscordBugSeverity,
  normalizeDiscordFeedbackEffortPoints,
  normalizeDiscordFeedbackReportType,
  recordDiscordBugReportForumState,
  recordDiscordBugReportForumThread,
  recordDiscordBugReportStaffMessage,
  shouldApplyDiscordFeedbackBacklogTag,
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
    effort_points: 3,
    area: "Settings",
    summary: "Token copy button failed",
    details: "I tapped Copy and nothing happened.",
    steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
    screenshot_url: "https://example.com/shot.png",
    attachment_count: 1,
    attachment_metadata: [
      {
        id: "att-1",
        filename: "bug.png",
        contentType: "image/png",
        size: 241394,
        url: "https://cdn.discordapp.com/ephemeral-attachments/bug.png",
        proxyUrl: "https://media.discordapp.net/ephemeral-attachments/bug.png",
      },
    ],
    attachment_pruned: false,
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
    completion_review_status: "not_required",
    completion_reviewed_at: null,
    completion_reviewed_by_discord_user_id: null,
    completion_review_note: null,
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
      if (filters.threadId && row.discord_forum_thread_id !== filters.threadId) {
        return false;
      }
      if (filters.fingerprint && row.duplicate_fingerprint !== filters.fingerprint) {
        return false;
      }
      if (filters.reportType && row.report_type !== filters.reportType) {
        return false;
      }
      if (filters.prefix && !String(row.id).toLowerCase().startsWith(String(filters.prefix).toLowerCase())) {
        return false;
      }
      if (filters.lowerId && String(row.id).toLowerCase() < String(filters.lowerId).toLowerCase()) {
        return false;
      }
      if (filters.upperId && String(row.id).toLowerCase() > String(filters.upperId).toLowerCase()) {
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
            threadId: null,
            fingerprint: null,
            reportType: null,
            prefix: null,
            lowerId: null,
            upperId: null,
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
              if (column === "report_type") {
                filters.reportType = value;
              }
              if (column === "discord_forum_thread_id") {
                filters.threadId = value;
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
                              const matches = findMatchingReports(filters);
                              return {
                                data: matches,
                                error: null,
                                async maybeSingle() {
                                  return { data: matches[0] ?? null, error: null };
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
            gte(column, value) {
              if (column === "id") {
                filters.lowerId = value;
              }

              return {
                lte(upperColumn, upperValue) {
                  if (upperColumn === "id") {
                    filters.upperId = upperValue;
                  }

                  return {
                    limit(limit) {
                      return {
                        data: findMatchingReports(filters).slice(0, limit),
                        error: null,
                      };
                    },
                  };
                },
              };
            },
            lte(column, value) {
              if (column === "id") {
                filters.upperId = value;
              }

              return {
                limit(limit) {
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
    { type: 1, components: [{ type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." }] },
  ], extractDiscordModalTextInputValue);

  assert.deepEqual(fields, {
    summary: "Copy button failed",
    area: "Settings",
    details: "I tapped Copy and nothing happened.",
  });
});

test("normalizeDiscordFeedbackReportType accepts bug and feature while rejecting fix for new submissions", () => {
  assert.equal(normalizeDiscordFeedbackReportType("bug"), "bug");
  assert.equal(normalizeDiscordFeedbackReportType("Feature"), "feature");
  assert.equal(normalizeDiscordFeedbackReportType("FEAT"), "feature");
  assert.equal(normalizeDiscordFeedbackReportType("fix"), null);
  assert.equal(normalizeDiscordFeedbackReportType("other"), null);
});

test("normalizeDiscordBugSeverity maps synonyms and defaults safely", () => {
  assert.equal(normalizeDiscordBugSeverity("HIGH"), "high");
  assert.equal(normalizeDiscordBugSeverity("critical"), "blocker");
  assert.equal(normalizeDiscordBugSeverity("minor"), "low");
  assert.equal(normalizeDiscordBugSeverity("not sure"), "medium");
});

test("feedback effort points stay fibonacci-bound and deterministic", () => {
  assert.equal(normalizeDiscordFeedbackEffortPoints(5), 5);
  assert.equal(normalizeDiscordFeedbackEffortPoints(4), null);
  assert.equal(estimateDiscordFeedbackEffortPoints(buildStoredRow({
    report_type: "bug",
    severity: "high",
    details: "Verification fails across every Discord role sync path and blocks the whole flow from completing.",
    steps_to_reproduce: "1. Open verification\n2. Verify once\n3. Verify again\n4. Watch the forum and role sync fail",
    duplicate_count: 4,
  })), 13);
});

test("buildDiscordBugForumThreadTitle formats bug and feature forum titles while keeping historical fix readable", () => {
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
      reportType: "feature",
      area: "routines",
      summary: "Let me share a routine",
    }),
    "Feature: Routines — Let me share a routine",
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

test("buildDiscordBugForumThreadBody formats bug forum cards with bug-specific labels", () => {
  assert.equal(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "bug",
        screenshot_url: "https://example.com/shot.png",
      }),
      reporterLabel: "Member #4",
    }),
    [
      "**Bug Report**",
      "Type: Bug",
      "Status: New",
      "Points: 3",
      "Severity: Medium",
      "Area: Settings",
      "Reporter: <@123456789012345678> / Member #4",
      "Report ID: `abc12345`",
      "Duplicate signals: 1",
      "",
      "**Title**",
      "Token copy button failed",
      "",
      "**Problem**",
      "I tapped Copy and nothing happened.",
      "",
      "**Expected behavior**",
      "The Settings flow should complete without the reported issue and give the user a clear result.",
      "",
      "**Actual behavior**",
      "I tapped Copy and nothing happened.",
      "",
      "**Steps to reproduce**",
      "Open Settings -> Account -> Generate token -> tap Copy",
      "",
      "**Acceptance Criteria**",
      "- The reported issue is reproduced or clearly explained.",
      "- The Settings flow behaves as expected after the fix.",
      "- The user sees a clear result instead of a misleading failure message.",
      "- The feedback card is updated when the issue is resolved.",
      "",
      "**Evidence**",
      "https://example.com/shot.png",
      "- bug.png (image/png, 241394 bytes): https://cdn.discordapp.com/ephemeral-attachments/bug.png",
    ].join("\n"),
  );
});

test("buildDiscordBugForumThreadBody formats feature forum cards without bug-only labels", () => {
  assert.equal(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "feature",
        status: "fixed",
        id: "abc12345-ffff-ffff-ffff-ffffffffffff",
        screenshot_url: "https://example.com/shot.png",
        steps_to_reproduce: null,
      }),
      reporterLabel: "Member #4",
    }),
    [
      "**Feature Request**",
      "Type: Feature",
      "Status: Completed",
      "Points: 3",
      "Area: Settings",
      "Reporter: <@123456789012345678> / Member #4",
      "Report ID: `abc12345`",
      "Duplicate signals: 1",
      "",
      "**Title**",
      "Token copy button failed",
      "",
      "**User Story**",
      "As a user, I want Token copy button failed, so that the Settings flow better matches the requested outcome.",
      "",
      "**Description**",
      "I tapped Copy and nothing happened.",
      "",
      "**Acceptance Criteria**",
      "- The requested capability is available to the intended user.",
      "- The Settings flow makes the requested outcome clear to users.",
      "- Operator or user-facing behavior changes are documented when needed.",
      "- The feedback card is updated when the feature is completed.",
      "",
      "**Evidence**",
      "https://example.com/shot.png",
      "- bug.png (image/png, 241394 bytes): https://cdn.discordapp.com/ephemeral-attachments/bug.png",
    ].join("\n"),
  );
  assert.doesNotMatch(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "feature",
      }),
      reporterLabel: "Member #4",
    }),
    /Severity:|What happened|^\*\*Steps\*\*$|^\*\*Actual behavior\*\*$/m,
  );
});

test("buildDiscordBugForumThreadBody preserves proper-name casing in feature user stories", () => {
  assert.match(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "feature",
        summary: "Music Sesh Phase 8 - Room System + Private Room Keys",
      }),
      reporterLabel: "Member #4",
    }),
    /\*\*User Story\*\*\nAs a user, I want Music Sesh Phase 8 - Room System \+ Private Room Keys, so that the Settings flow better matches the requested outcome\./,
  );
});

test("buildDiscordBugForumThreadBody uses stored feature acceptance criteria when provided", () => {
  assert.match(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "feature",
        summary: "Play Wine or Cheese from the main channel",
        details: "Run Wine or Cheese as a main-channel narrator game backed by a Vercel service.",
        steps_to_reproduce: [
          "- Typing computa let's play wine or cheese starts the game in the same channel.",
          "- Only the player who started the game can choose.",
          "- No dedicated gameplay thread is created.",
        ].join("\n"),
      }),
      reporterLabel: "Member #4",
    }),
    /\*\*Acceptance Criteria\*\*\n- Typing computa let's play wine or cheese starts the game in the same channel\.\n- Only the player who started the game can choose\.\n- No dedicated gameplay thread is created\./m,
  );
});

test("buildDiscordBugForumThreadBody preserves feature acceptance criteria when description is long", () => {
  const body = buildDiscordBugForumThreadBody({
    report: buildStoredRow({
      report_type: "feature",
      summary: "Play Wine or Cheese from the main channel",
      details: Array.from({ length: 24 }, (_, index) => `Scoped main-channel narrator detail ${index + 1}.`).join(" "),
      steps_to_reproduce: [
        "Typing computa let's play wine or cheese starts the game in the same channel.",
        "Only the player who started the game can choose.",
        "No dedicated gameplay thread is created.",
        "Vercel owns story logic and no Supabase is required for MVP.",
      ].join("\n"),
      screenshot_url: null,
      attachment_metadata: null,
      attachment_count: 0,
    }),
    reporterLabel: "Member #4",
  });

  assert.match(body, /\*\*Description\*\*\nScoped main-channel narrator detail 1\./m);
  assert.match(body, /\*\*Acceptance Criteria\*\*\n- Typing computa let's play wine or cheese starts the game in the same channel\./m);
  assert.match(body, /\*\*Evidence\*\*\nNot provided/m);
});

test("buildDiscordBugForumThreadBody keeps bug fixed copy as Fixed", () => {
  assert.match(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "bug",
        status: "fixed",
      }),
      reporterLabel: "Member #4",
    }),
    /^.*Status: Fixed/m,
  );
});

test("buildDiscordBugForumThreadBody keeps historical fix rows readable", () => {
  assert.match(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        report_type: "fix",
      }),
      reporterLabel: "Member #4",
    }),
    /^\*\*Feedback Report\*\*\nType: Fix/m,
  );
});

test("buildDiscordBugForumThreadBody stays within Discord's message limit for long bug cards", () => {
  const body = buildDiscordBugForumThreadBody({
    report: buildStoredRow({
      summary: "New Routine Opens Recovery Screen",
      details: "D".repeat(1100),
      steps_to_reproduce: "S".repeat(1100),
      screenshot_url: `https://example.com/${"x".repeat(460)}`,
      attachment_metadata: [
        {
          id: "att-1",
          filename: "very-long-debug-screenshot-name.png",
          contentType: "image/png",
          size: 305171,
          url: `https://cdn.discordapp.com/ephemeral-attachments/${"a".repeat(220)}`,
          proxyUrl: null,
        },
      ],
    }),
    reporterLabel: "Member #4",
  });

  assert.ok(body.length <= DISCORD_BUG_REPORT_FORUM_BODY_MAX_LENGTH);
  assert.match(body, /\*\*Problem\*\*/);
  assert.match(body, /\*\*Acceptance Criteria\*\*/);
  assert.match(body, /\*\*Steps to reproduce\*\*/);
  assert.match(body, /New Routine Opens Recovery Screen/);
});

test("buildDiscordBugForumDuplicateReply and withdraw reply stay compact", () => {
  assert.equal(
    buildDiscordBugForumDuplicateReply({
      reportType: "bug",
      reporterLabel: "Member #7",
      duplicateCount: 3,
    }),
    "Duplicate signal added.\nDuplicate signals: 3",
  );
  assert.equal(
    buildDiscordFeedbackWithdrawThreadReply(),
    "Feedback withdrawn by reporter.\nDetails and attachments were removed from the public card.",
  );
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

test("buildDiscordBugForumTagNames applies severity only to bug cards", () => {
  assert.deepEqual(buildDiscordBugForumTagNames({
    reportType: "bug",
    status: "new",
    severity: "medium",
  }), ["Bug", "New", "Medium"]);

  assert.deepEqual(buildDiscordBugForumTagNames({
    reportType: "feature",
    status: "withdrawn",
    severity: "high",
  }), ["Feature", "Withdrawn"]);
});

test("buildDiscordBugForumTagNames can include Backlog alongside planning statuses", () => {
  assert.deepEqual(buildDiscordBugForumTagNames({
    reportType: "feature",
    status: "confirmed",
    severity: "medium",
    includeBacklog: true,
  }), ["Feature", "Confirmed", "Backlog"]);

  assert.deepEqual(buildDiscordBugForumTagNames({
    reportType: "bug",
    status: "fawxzzy_review",
    severity: "high",
    includeBacklog: true,
  }), ["Bug", "Ready for Fawxzzy Review", "High", "Backlog"]);
});

test("shouldApplyDiscordFeedbackBacklogTag only applies to public reviewed-not-started cards", () => {
  assert.equal(shouldApplyDiscordFeedbackBacklogTag(buildStoredRow({
    status: "confirmed",
    area: "Spotify Club",
  })), true);

  assert.equal(shouldApplyDiscordFeedbackBacklogTag(buildStoredRow({
    status: "fawxzzy_review",
    area: "Spotify Club",
  })), true);

  assert.equal(shouldApplyDiscordFeedbackBacklogTag(buildStoredRow({
    status: "in_progress",
    area: "Spotify Club",
  })), false);

  assert.equal(shouldApplyDiscordFeedbackBacklogTag(buildStoredRow({
    status: "confirmed",
    area: "Feedback Testing",
    summary: "Feedback canary: do not promote",
  })), false);
});

test("buildDiscordBugStatusThreadReply only pings the reporter when explicitly requested", () => {
  assert.equal(
    buildDiscordBugStatusThreadReply({
      reportType: "bug",
      statusBefore: "confirmed",
      status: "needs_info",
      note: "Can you share the exact screen? @everyone",
      reporterDiscordUserId: "123456789012345678",
      includeReporterMention: true,
    }),
    "<@123456789012345678> Card updated by Fawx Security.\nStatus: Confirmed -> Needs Info\nNote: Can you share the exact screen? @\u200beveryone",
  );

  assert.equal(
    buildDiscordBugStatusThreadReply({
      reportType: "feature",
      statusBefore: "in_progress",
      status: "fixed",
      note: null,
      reporterDiscordUserId: "123456789012345678",
      includeReporterMention: false,
    }),
    "Marked resolved by Fawx Security.\nStatus: In Progress -> Completed",
  );

  assert.equal(
    buildDiscordBugStatusThreadReply({
      reportType: "feature",
      statusBefore: null,
      status: "withdrawn",
      note: null,
      reporterDiscordUserId: "123456789012345678",
      includeReporterMention: false,
    }),
    "Card updated by Fawx Security.\nStatus: Withdrawn",
  );
});

test("forum body and replies stay text-only even when custom emoji env vars are set", () => {
  process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID = "1505007702924068916";
  process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID = "1505007651308703877";

  const featureBody = buildDiscordBugForumThreadBody({
    report: buildStoredRow({
      report_type: "feature",
    }),
    reporterLabel: "Member #4",
  });
  const duplicateReply = buildDiscordBugForumDuplicateReply({
    reportType: "bug",
    reporterLabel: "Member #7",
    duplicateCount: 2,
  });
  const statusReply = buildDiscordBugStatusThreadReply({
    reportType: "feature",
    status: "fixed",
    note: null,
    reporterDiscordUserId: null,
    includeReporterMention: false,
  });

  assert.doesNotMatch(featureBody, /^<:/);
  assert.doesNotMatch(duplicateReply, /^<:/);
  assert.doesNotMatch(statusReply, /^<:/);

  delete process.env.DISCORD_FEEDBACK_BUG_EMOJI_ID;
  delete process.env.DISCORD_FEEDBACK_FEATURE_EMOJI_ID;
});

test("normalizeDiscordBugReportInput trims long summary and long details to bounded lengths", () => {
  const normalized = normalizeDiscordBugReportInput({
    summary: `  ${"S".repeat(DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH + 40)}  `,
    area: " Settings ",
    details: `  ${"D".repeat(DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH + 100)}  `,
  }, "feature");

  assert.ok(normalized);
  assert.equal(normalized?.summary.length, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH);
  assert.equal(normalized?.details.length, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);
  assert.equal(normalized?.area, "Settings");
  assert.equal(normalized?.reportType, "feature");
});

test("normalizeDiscordBugReportInput rejects empty summary or details after trimming", () => {
  assert.equal(normalizeDiscordBugReportInput({
    summary: "   ",
    area: "Settings",
    details: "Something failed",
  }), null);

  assert.equal(normalizeDiscordBugReportInput({
    summary: "Something failed",
    area: "Settings",
    details: "   ",
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
      details: "Something failed",
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
      details: "Something failed",
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
    reportType: "feature",
    modalFields: {
      summary: "Token button didn't copy",
      area: "Settings",
      details: "I tapped Copy and nothing happened.",
    },
    attachments: [
      {
        id: "att-feature",
        filename: "feature.png",
        contentType: "image/png",
        size: 12000,
        url: "https://cdn.discordapp.com/ephemeral-attachments/feature.png",
        proxyUrl: "https://media.discordapp.net/ephemeral-attachments/feature.png",
      },
    ],
    adminClient,
    now: new Date("2026-05-15T13:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.duplicate, false);
  assert.equal(result.report.report_type, "feature");
  assert.equal(observed.insertedValues[0]?.attachment_count, 1);
  assert.deepEqual(observed.insertedValues[0]?.attachment_metadata, [
    {
      id: "att-feature",
      filename: "feature.png",
      contentType: "image/png",
      size: 12000,
      url: "https://cdn.discordapp.com/ephemeral-attachments/feature.png",
      proxyUrl: "https://media.discordapp.net/ephemeral-attachments/feature.png",
    },
  ]);
  assert.equal(
    observed.insertedValues[0]?.duplicate_fingerprint,
    createDiscordBugReportDuplicateFingerprint({
      reportType: "feature",
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
      details: "Different details that should not be stored again.",
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

test("createDiscordBugReport folds near-duplicate wording into the existing report", async () => {
  const existingDuplicate = buildStoredRow({
    id: "existing-heuristic-report",
    summary: "Copy button does not work",
    details: "I tapped Copy after generating a token and nothing happened.",
    area: "Account",
    duplicate_fingerprint: "legacy-fingerprint",
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
    interactionId: "interaction-3",
    reporterDiscordUserId: "999999999999999999",
    reporterDiscordUsername: "zac-two",
    reportType: "bug",
    modalFields: {
      summary: "Copy button didn't work",
      area: "Account",
      details: "After I generated a token, tapping Copy failed and nothing happened.",
    },
    adminClient,
    now: new Date("2026-05-15T15:00:00.000Z"),
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.duplicate, true);
  assert.equal(result.report.id, "existing-heuristic-report");
  assert.equal(observed.insertedValues.length, 0);
  assert.equal(observed.updatedCalls[0]?.values?.duplicate_count, 2);
});

test("findDiscordBugReportByIdOrPrefix resolves UUIDs, 6+ short ids, thread ids, and thread URLs", async () => {
  const reportOne = buildStoredRow({
    id: "abcd1234-ffff-4fff-8fff-ffffffffffff",
    discord_forum_thread_id: "1504673475489562745",
  });
  const reportTwo = buildStoredRow({
    id: "abcd12ef-ffff-4fff-8fff-ffffffffffff",
    summary: "Another report",
    discord_forum_thread_id: "1504673475489562999",
  });
  const unique = createMockAdminClient({ reports: [reportOne] });
  const ambiguous = createMockAdminClient({ reports: [reportOne, reportTwo] });

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "abcd1234-ffff-4fff-8fff-ffffffffffff",
      adminClient: unique.adminClient,
    }),
    { ok: true, report: reportOne },
  );

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "abcd1234",
      adminClient: unique.adminClient,
    }),
    { ok: true, report: reportOne },
  );

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "abcd12",
      adminClient: ambiguous.adminClient,
    }),
    { ok: false, code: "DISCORD_BUG_REPORT_AMBIGUOUS_ID" },
  );

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "1504673475489562745",
      adminClient: unique.adminClient,
    }),
    { ok: true, report: reportOne },
  );

  assert.deepEqual(
    await findDiscordBugReportByIdOrPrefix({
      reportIdOrPrefix: "https://discord.com/channels/1504668396338413670/1504673475489562745/1504673475489562746",
      adminClient: unique.adminClient,
    }),
    { ok: true, report: reportOne },
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
  assert.equal(result.report.attachment_pruned, true);
  assert.equal(result.report.attachment_metadata, null);
  assert.equal(result.report.details_pruned, true);
  assert.equal(result.report.status_note, "Withdrawn by reporter");
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
