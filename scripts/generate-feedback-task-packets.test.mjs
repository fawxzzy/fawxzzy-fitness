import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_DECISIONS_EXAMPLE_OUT,
  DEFAULT_JSON_OUT,
  DEFAULT_MARKDOWN_OUT,
  DEFAULT_PROMPTS_OUT,
  buildTaskPacketResult,
  generateFeedbackTaskPackets,
  loadBoardRecords,
  parseArgs,
  renderCodexPrompts,
  repoRoot,
  resolveOutputPaths,
} from "./generate-feedback-task-packets.mjs";

function buildRecord(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    report_type: "bug",
    status: "confirmed",
    area: "Security",
    title: "Verification controls fail on repeated attempts",
    description: "Repeated verification attempts should surface staff-visible context and controlled failure handling.",
    duplicate_count: 1,
    attachment_count: 0,
    card_sections: {
      header_label: "Bug Report",
      title: "Verification controls fail on repeated attempts",
      problem: "Repeated verification attempts fail without enough context.",
      expected_behavior: "Repeated verification attempts should produce a clear, actionable result.",
      actual_behavior: "The current flow fails without enough context.",
      steps_to_reproduce: "1. Verify twice\\n2. Observe the failure",
      user_story: null,
      description: null,
      acceptance_criteria: [
        "The reported issue is reproduced or clearly explained.",
        "The Security flow behaves as expected after the fix.",
      ],
      evidence_summary: "Evidence included: 1 screenshot.",
    },
    forum_thread_link: "https://discord.com/channels/1504668396338413670/1505000000000000000",
    reporter_discord_user_id: "123456789012345678",
    attachments: [{ name: "screen.png", bytes: "raw-bytes-should-never-export" }],
    last_seen_at: "2026-05-17T04:00:00.000Z",
    ...overrides,
  };
}

function writeBoardFixture(records) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-task-packets-"));
  const sourcePath = path.join(tempDir, "latest.json");
  fs.writeFileSync(sourcePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
  return { tempDir, sourcePath };
}

test("task packet parseArgs defaults to confirmed, Fawxzzy review, and in_progress statuses", () => {
  const args = parseArgs([]);

  assert.deepEqual(args.statuses, ["confirmed", "fawxzzy_review", "in_progress"]);
  assert.deepEqual(args.types, ["bug", "feature"]);
  assert.equal(args.codexPrompts, false);
});

test("task packet output paths stay under runtime/feedback-tasks by default", () => {
  const paths = resolveOutputPaths(parseArgs([]));

  assert.equal(paths.markdown, path.join(repoRoot, "runtime", "feedback-tasks", DEFAULT_MARKDOWN_OUT));
  assert.equal(paths.json, path.join(repoRoot, "runtime", "feedback-tasks", DEFAULT_JSON_OUT));
  assert.equal(paths.decisionsExample, path.join(repoRoot, "runtime", "feedback-tasks", DEFAULT_DECISIONS_EXAMPLE_OUT));
});

test("task packet generation excludes withdrawn spam duplicate closed and fixed by default", () => {
  const records = loadBoardRecords(
    writeBoardFixture([
      buildRecord({ id: "a1111111-1111-4111-8111-111111111111", status: "confirmed" }),
      buildRecord({ id: "b2222222-2222-4222-8222-222222222222", status: "in_progress" }),
      buildRecord({ id: "c3333333-3333-4333-8333-333333333333", status: "withdrawn" }),
      buildRecord({ id: "d4444444-4444-4444-8444-444444444444", status: "spam" }),
      buildRecord({ id: "e5555555-5555-4555-8555-555555555555", status: "duplicate" }),
      buildRecord({ id: "f6666666-6666-4666-8666-666666666666", status: "closed" }),
      buildRecord({ id: "g7777777-7777-4777-8777-777777777777", status: "fixed" }),
    ]).sourcePath,
  );
  const result = buildTaskPacketResult({
    records: records.filter((record) => ["confirmed", "in_progress"].includes(record.status)),
    inputCount: records.length,
    args: parseArgs([]),
    sourcePath: "fixture.json",
  });

  assert.equal(result.summary.inputCards, 7);
  assert.equal(result.summary.includedCards, 2);
});

test("task packet generation groups related records into a single packet", () => {
  const args = parseArgs([]);
  const records = loadBoardRecords(
    writeBoardFixture([
      buildRecord({
        id: "11111111-1111-4111-8111-111111111111",
        title: "Verification controls fail on repeated attempts",
        description: "Repeated verification attempts should surface better failure handling.",
      }),
      buildRecord({
        id: "22222222-2222-4222-8222-222222222222",
        title: "Repeated verification attempts need controls",
        description: "Verification attempts should show staff-visible alerts and better controls.",
        duplicate_count: 2,
      }),
    ]).sourcePath,
  );
  const result = buildTaskPacketResult({
    records,
    inputCount: records.length,
    args,
    sourcePath: "fixture.json",
  });

  assert.equal(result.packets.length, 1);
  assert.deepEqual(result.packets[0].feedbackShortIds, ["11111111", "22222222"]);
  assert.equal(result.packets[0].duplicateCount, 3);
});

test("task packet outputs mask discord ids and attachment bytes by default", async () => {
  const { tempDir, sourcePath } = writeBoardFixture([
    buildRecord({ attachment_count: 2 }),
  ]);
  const outputDir = path.join(tempDir, "out");

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("task packet generation should not call fetch");
  };

  try {
    const { result, outputPaths } = await generateFeedbackTaskPackets({
      args: {
        ...parseArgs([]),
        from: sourcePath,
        outDir: outputDir,
      },
    });

    const json = fs.readFileSync(outputPaths.json, "utf8");

    assert.equal(result.packets[0].attachmentsCount, 2);
    assert.equal(result.packets[0].debug, undefined);
    assert.doesNotMatch(json, /123456789012345678/);
    assert.doesNotMatch(json, /raw-bytes-should-never-export/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("task packet export carries card sections and acceptance criteria forward", () => {
  const records = loadBoardRecords(
    writeBoardFixture([
      buildRecord({
        report_type: "feature",
        area: "Feedback",
        title: "Make cards feel like Jira stories",
        description: "Feedback cards should use clearer sections.",
        card_sections: {
          header_label: "Feature Request",
          title: "Make cards feel like Jira stories",
          problem: null,
          expected_behavior: null,
          actual_behavior: null,
          steps_to_reproduce: null,
          user_story: "As an admin, I want clearer feedback cards, so that review is faster.",
          description: "Feedback cards should use clearer sections.",
          acceptance_criteria: [
            "Feature cards show Title, User Story, Description, Acceptance Criteria, and Evidence.",
          ],
          evidence_summary: "No screenshot or attachment evidence was provided.",
        },
      }),
    ]).sourcePath,
  );
  const result = buildTaskPacketResult({
    records,
    inputCount: records.length,
    args: parseArgs(["--type", "feature"]),
    sourcePath: "fixture.json",
  });

  assert.equal(result.packets[0].cardSections[0].userStory, "As an admin, I want clearer feedback cards, so that review is faster.");
  assert.deepEqual(result.packets[0].acceptanceCriteria[0], "Feature cards show Title, User Story, Description, Acceptance Criteria, and Evidence.");
});

test("task packet generation surfaces Fawxzzy review cards clearly", () => {
  const records = loadBoardRecords(
    writeBoardFixture([
      buildRecord({
        status: "fawxzzy_review",
        area: "Feedback",
        title: "Queue card for manual owner review",
      }),
    ]).sourcePath,
  );
  const result = buildTaskPacketResult({
    records,
    inputCount: records.length,
    args: parseArgs([]),
    sourcePath: "fixture.json",
  });

  assert.equal(result.packets[0].cardSections[0].statusLabel, "Ready for Fawxzzy Review");
  assert.equal(
    result.packets[0].statusSuggestions.some((item) => /Manual Fawxzzy review is active/i.test(item)),
    true,
  );
});

test("task packet generation writes markdown json and optional codex prompts", async () => {
  const { tempDir, sourcePath } = writeBoardFixture([
    buildRecord(),
  ]);
  const outputDir = path.join(tempDir, "custom-output");

  const { outputPaths } = await generateFeedbackTaskPackets({
    args: {
      ...parseArgs(["--codex-prompts"]),
      from: sourcePath,
      outDir: outputDir,
      codexPrompts: true,
    },
  });

  assert.equal(fs.existsSync(outputPaths.markdown), true);
  assert.equal(fs.existsSync(outputPaths.json), true);
  assert.equal(fs.existsSync(outputPaths.prompts), true);
  assert.equal(fs.existsSync(outputPaths.decisionsExample), true);
  assert.match(fs.readFileSync(outputPaths.markdown, "utf8"), /# Feedback Reviewed Task Packets/);
  assert.match(fs.readFileSync(outputPaths.prompts, "utf8"), /Draft only — requires human review before execution\./);
});

test("codex prompts include the exact draft-only warning", () => {
  const result = buildTaskPacketResult({
    records: [
      loadBoardRecords(writeBoardFixture([buildRecord()]).sourcePath)[0],
    ],
    inputCount: 1,
    args: parseArgs([]),
    sourcePath: "fixture.json",
  });
  const prompts = renderCodexPrompts(result);

  assert.match(prompts, /Draft only — requires human review before execution\./);
});

test("decisions file orders approved packets first and summarizes deferred packets separately", async () => {
  const { tempDir, sourcePath } = writeBoardFixture([
    buildRecord({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Verification controls fail on repeated attempts",
      description: "Repeated verification attempts should surface better failure handling.",
      area: "Security",
    }),
    buildRecord({
      id: "22222222-2222-4222-8222-222222222222",
      title: "Repeated verification attempts need controls",
      description: "Verification attempts should show staff-visible alerts and better controls.",
      area: "Security",
    }),
    buildRecord({
      id: "33333333-3333-4333-8333-333333333333",
      report_type: "feature",
      area: "Feedback",
      title: "Feedback exports need reviewer packets",
      description: "Reviewed task packets should be generated from the board export.",
    }),
  ]);

  const records = loadBoardRecords(sourcePath);
  const packetIds = buildTaskPacketResult({
    records,
    inputCount: records.length,
    args: parseArgs([]),
    sourcePath,
  }).packets.map((packet) => packet.packetId);

  const decisionsPath = path.join(tempDir, "decisions.json");
  fs.writeFileSync(decisionsPath, `${JSON.stringify([
    {
      packetId: packetIds[1],
      decision: "approve",
      reviewer: "zac",
      notes: "Ready for a reviewed Codex pass.",
      approvedAt: "2026-05-17T12:00:00.000Z",
    },
    {
      packetId: packetIds[0],
      decision: "defer",
      reviewer: "zac",
      notes: "Need more evidence before implementation.",
      approvedAt: "2026-05-17T12:05:00.000Z",
    },
  ], null, 2)}\n`, "utf8");

  const { result } = await generateFeedbackTaskPackets({
    args: {
      ...parseArgs([]),
      from: sourcePath,
      outDir: path.join(tempDir, "out"),
      decisions: decisionsPath,
    },
  });

  assert.equal(result.packets[0].reviewerDecision, "approve");
  assert.equal(result.reviewSummary.defer.length, 1);
  assert.equal(result.reviewSummary.defer[0].packetId, packetIds[0]);
});
