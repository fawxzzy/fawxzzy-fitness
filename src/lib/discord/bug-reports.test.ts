// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordBugForumDuplicateReply,
  buildDiscordBugForumThreadBody,
  buildDiscordBugForumThreadTitle,
  createDiscordBugReport,
  createDiscordBugReportDuplicateFingerprint,
  DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH,
  DISCORD_BUG_REPORT_SCREENSHOT_URL_MAX_LENGTH,
  DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH,
  extractDiscordBugReportModalFields,
  normalizeDiscordBugReportInput,
  normalizeDiscordBugSeverity,
  recordDiscordBugReportForumThread,
  recordDiscordBugReportStaffMessage,
  splitDiscordBugStepsAndScreenshot,
} from "./bug-reports.ts";
import { extractDiscordModalTextInputValue } from "./interactions.ts";

function buildStoredRow(overrides = {}) {
  return {
    id: "report-1",
    source: "discord",
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
    staff_channel_message_id: null,
    closed_at: null,
    pruned_at: null,
    details_pruned: false,
    triage_notes: null,
    created_at: "2026-05-15T13:00:00.000Z",
    updated_at: "2026-05-15T13:00:00.000Z",
    ...overrides,
  };
}

function createMockAdminClient(options = {}) {
  const observed = {
    insertedValues: [],
    updatedCalls: [],
  };

  const adminClient = {
    from(table) {
      return {
        select(_columns, selectOptions) {
          if (table === "discord_bug_reports" && selectOptions?.head) {
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

          let selectedStatus = null;
          let selectedFingerprint = null;

          return {
            eq(column, value) {
              if (column === "duplicate_fingerprint") {
                selectedFingerprint = value;
              }

              return {
                in(statusColumn, statuses) {
                  if (statusColumn === "status") {
                    selectedStatus = statuses;
                  }

                  return {
                    gte() {
                      return {
                        order() {
                          return {
                            limit() {
                              return {
                                async maybeSingle() {
                                  if (
                                    options.existingDuplicate
                                    && selectedFingerprint === options.existingDuplicate.duplicate_fingerprint
                                    && Array.isArray(selectedStatus)
                                  ) {
                                    return {
                                      data: options.existingDuplicate,
                                      error: null,
                                    };
                                  }

                                  return { data: null, error: null };
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
        insert(values) {
          observed.insertedValues.push(values);
          return {
            select() {
              return {
                async single() {
                  return {
                    data: buildStoredRow({
                      ...values,
                      duplicate_fingerprint: values.duplicate_fingerprint,
                      duplicate_count: values.duplicate_count ?? 1,
                      first_seen_at: values.first_seen_at ?? "2026-05-15T13:00:00.000Z",
                      last_seen_at: values.last_seen_at ?? "2026-05-15T13:00:00.000Z",
                    }),
                    error: null,
                  };
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
              return {
                select() {
                  return {
                    async single() {
                      return {
                        data: buildStoredRow({
                          ...(options.existingDuplicate ?? {}),
                          ...values,
                          id,
                        }),
                        error: null,
                      };
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

  return { adminClient, observed };
}

test("extractDiscordBugReportModalFields maps Discord modal rows into named bug fields", () => {
  const fields = extractDiscordBugReportModalFields([
    {
      type: 1,
      components: [
        { type: 4, custom_id: "bug_summary", value: "Copy button failed" },
      ],
    },
    {
      type: 1,
      components: [
        { type: 4, custom_id: "bug_area", value: "Settings" },
      ],
    },
    {
      type: 1,
      components: [
        { type: 4, custom_id: "bug_severity", value: "High" },
      ],
    },
    {
      type: 1,
      components: [
        { type: 4, custom_id: "bug_details", value: "I tapped Copy and nothing happened." },
      ],
    },
    {
      type: 1,
      components: [
        { type: 4, custom_id: "bug_steps", value: "Open Settings https://example.com/shot.png" },
      ],
    },
  ], extractDiscordModalTextInputValue);

  assert.deepEqual(fields, {
    summary: "Copy button failed",
    area: "Settings",
    severity: "High",
    details: "I tapped Copy and nothing happened.",
    stepsAndScreenshot: "Open Settings https://example.com/shot.png",
  });
});

test("normalizeDiscordBugSeverity maps synonyms and defaults safely", () => {
  assert.equal(normalizeDiscordBugSeverity("HIGH"), "high");
  assert.equal(normalizeDiscordBugSeverity("critical"), "blocker");
  assert.equal(normalizeDiscordBugSeverity("minor"), "low");
  assert.equal(normalizeDiscordBugSeverity("not sure"), "medium");
});

test("buildDiscordBugForumThreadTitle formats the visible forum title", () => {
  assert.equal(
    buildDiscordBugForumThreadTitle({
      severity: "medium",
      area: "settings",
      summary: "Copy button does not work",
    }),
    "[Bug][Medium] Settings — Copy button does not work",
  );
});

test("buildDiscordBugForumThreadBody formats the first forum post body", () => {
  assert.equal(
    buildDiscordBugForumThreadBody({
      report: buildStoredRow({
        id: "abc12345-ffff-ffff-ffff-ffffffffffff",
        screenshot_url: "https://example.com/shot.png",
      }),
      reporterLabel: "Member #4",
    }),
    [
      "**Bug Report**",
      "Status: New",
      "Severity: Medium",
      "Area: Settings",
      "Reporter: Member #4",
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

test("buildDiscordBugForumDuplicateReply formats the duplicate thread reply", () => {
  assert.equal(
    buildDiscordBugForumDuplicateReply({
      reporterLabel: "Member #7",
      duplicateCount: 3,
    }),
    "Another report matched this bug.\nReporter: Member #7\nDuplicate signals: 3",
  );
});

test("normalizeDiscordBugReportInput trims long summary and long details to bounded lengths", () => {
  const normalized = normalizeDiscordBugReportInput({
    summary: `  ${"S".repeat(DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH + 40)}  `,
    area: " Settings ",
    severity: "high",
    details: `  ${"D".repeat(DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH + 100)}  `,
    stepsAndScreenshot: null,
  });

  assert.ok(normalized);
  assert.equal(normalized?.summary.length, DISCORD_BUG_REPORT_SUMMARY_MAX_LENGTH);
  assert.equal(normalized?.details.length, DISCORD_BUG_REPORT_DETAILS_MAX_LENGTH);
  assert.equal(normalized?.area, "Settings");
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
  assert.deepEqual(
    splitDiscordBugStepsAndScreenshot(`Steps first ${longUrl}`),
    {
      steps: "Steps first",
      screenshotUrl: null,
    },
  );

  assert.deepEqual(
    splitDiscordBugStepsAndScreenshot("Open Settings then check data:image/png;base64,abcdef"),
    {
      steps: "Open Settings then check data:image/png;base64,abcdef",
      screenshotUrl: null,
    },
  );
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

test("createDiscordBugReport uses a deterministic duplicate fingerprint without reporter id salt", async () => {
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
  assert.equal(result.reporterLink.memberNumber, 4);
  assert.equal(
    observed.insertedValues[0]?.duplicate_fingerprint,
    createDiscordBugReportDuplicateFingerprint({
      area: "Settings",
      summary: "Token button didn't copy",
    }),
  );
  assert.equal(observed.insertedValues[0]?.steps_to_reproduce, "Open Settings -> Account -> Generate token -> tap Copy");
  assert.equal(observed.insertedValues[0]?.screenshot_url, "https://example.com/shot.png");
});

test("createDiscordBugReport folds duplicates into an existing row instead of inserting again", async () => {
  const existingDuplicate = buildStoredRow({
    id: "existing-report",
    duplicate_fingerprint: createDiscordBugReportDuplicateFingerprint({
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
    existingDuplicate,
  });

  const result = await createDiscordBugReport({
    interactionId: "interaction-2",
    reporterDiscordUserId: "999999999999999999",
    reporterDiscordUsername: "new-zac",
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
  assert.equal(observed.updatedCalls.length, 1);
  assert.equal(observed.updatedCalls[0]?.values?.duplicate_count, 3);
  assert.equal(observed.updatedCalls[0]?.values?.reporter_discord_username, "new-zac");
});

test("recordDiscordBugReportStaffMessage stores the notification message id", async () => {
  const { adminClient, observed } = createMockAdminClient();
  const result = await recordDiscordBugReportStaffMessage({
    reportId: "report-1",
    messageId: "discord-message-1",
    adminClient,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(observed.updatedCalls[0]?.id, "report-1");
  assert.equal(observed.updatedCalls[0]?.values?.staff_channel_message_id, "discord-message-1");
});

test("recordDiscordBugReportForumThread stores the linked forum thread ids", async () => {
  const { adminClient, observed } = createMockAdminClient();
  const result = await recordDiscordBugReportForumThread({
    reportId: "report-1",
    forumChannelId: "1504673475489562744",
    forumThreadId: "1504673475489562745",
    forumMessageId: "1504673475489562746",
    adminClient,
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(observed.updatedCalls[0]?.id, "report-1");
  assert.equal(observed.updatedCalls[0]?.values?.discord_forum_channel_id, "1504673475489562744");
  assert.equal(observed.updatedCalls[0]?.values?.discord_forum_thread_id, "1504673475489562745");
  assert.equal(observed.updatedCalls[0]?.values?.discord_forum_message_id, "1504673475489562746");
});
