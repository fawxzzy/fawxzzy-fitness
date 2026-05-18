import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_JSON_OUT,
  DEFAULT_MARKDOWN_OUT,
  exportFeedbackBoard,
  formatDisplayStatusLabel,
  parseArgs,
  renderCodexDrafts,
  renderBoardMarkdown,
  repoRoot,
  resolveOutputPaths,
  toBoardRecord,
} from "./export-feedback-board.mjs";

function buildRow(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    report_type: "bug",
    status: "new",
    area: "Account",
    summary: "Copy button does not work",
    details: "Tapping Copy did not copy the token.",
    duplicate_count: 1,
    attachment_count: 0,
    discord_forum_thread_id: "1504673475489562745",
    reporter_discord_user_id: "123456789012345678",
    last_seen_at: "2026-05-16T12:00:00.000Z",
    ...overrides,
  };
}

function createMockClient(rows) {
  return {
    from() {
      const filters = {
        statuses: null,
        types: null,
        area: null,
      };

      return {
        select() {
          return {
            eq(column, value) {
              if (column === "status") {
                filters.statuses = [value];
              }
              if (column === "report_type") {
                filters.types = [value];
              }
              if (column === "area") {
                filters.area = value;
              }
              return this;
            },
            in(column, values) {
              if (column === "status") {
                filters.statuses = values;
              }
              if (column === "report_type") {
                filters.types = values;
              }
              return this;
            },
            order() {
              return {
                async limit(limit) {
                  let filtered = [...rows];
                  if (filters.statuses) {
                    filtered = filtered.filter((row) => filters.statuses.includes(row.status));
                  }
                  if (filters.types) {
                    filtered = filtered.filter((row) => filters.types.includes(row.report_type));
                  }
                  if (filters.area) {
                    filtered = filtered.filter((row) => row.area === filters.area);
                  }

                  return {
                    data: filtered.slice(0, limit),
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("feature fixed displays Completed while bug fixed stays Fixed", () => {
  assert.equal(formatDisplayStatusLabel("feature", "fixed"), "Completed");
  assert.equal(formatDisplayStatusLabel("bug", "fixed"), "Fixed");
});

test("board export parseArgs defaults to writing markdown and json", () => {
  const args = parseArgs([]);

  assert.equal(args.writeMarkdown, true);
  assert.equal(args.writeJson, true);
  assert.equal(args.codexDrafts, false);
});

test("board export default output paths stay under runtime feedback-board", () => {
  const paths = resolveOutputPaths(parseArgs([]));

  assert.equal(paths.markdown, path.join(repoRoot, DEFAULT_MARKDOWN_OUT));
  assert.equal(paths.json, path.join(repoRoot, DEFAULT_JSON_OUT));
});

test("board export keeps codex drafts alongside a custom --out target", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-board-paths-"));
  const paths = resolveOutputPaths({
    ...parseArgs(["--codex-drafts"]),
    out: path.join(tempDir, "board"),
  });

  assert.equal(paths.codexDrafts, path.join(tempDir, "codex-drafts.md"));
});

test("board export masks Discord ids unless debug is enabled", () => {
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  const masked = toBoardRecord(buildRow(), false);
  const debug = toBoardRecord(buildRow(), true);

  assert.equal(masked.reporter_discord_user_id, undefined);
  assert.equal(masked.reporter_discord_user_id_masked, "**************5678");
  assert.equal(debug.reporter_discord_user_id, "123456789012345678");
  assert.equal(masked.forum_thread_link, "https://discord.com/channels/1504668396338413670/1504673475489562745");
});

test("board export includes structured card sections and acceptance criteria", () => {
  const record = toBoardRecord(buildRow({
    report_type: "bug",
    details: "Verification says Discord could not assign the role.",
    steps_to_reproduce: "1. Generate token\\n2. Verify account",
    screenshot_url: "https://example.com/verify.png",
    attachment_count: 1,
    attachment_metadata: [
      {
        id: "att-1",
        filename: "verify.png",
        contentType: "image/png",
        size: 24012,
        url: "https://cdn.discordapp.com/verify.png",
        proxyUrl: null,
      },
    ],
  }));

  assert.equal(record.card_sections.problem, "Verification says Discord could not assign the role.");
  assert.equal(record.card_sections.steps_to_reproduce, "1. Generate token\\n2. Verify account");
  assert.equal(record.card_sections.acceptance_criteria.length > 0, true);
  assert.match(record.card_sections.evidence_summary, /Evidence included:/);
});

test("board markdown groups cards by status and separates bugs from features", () => {
  const markdown = renderBoardMarkdown([
    toBoardRecord(buildRow({
      report_type: "bug",
      status: "confirmed",
      area: "Account",
      summary: "Copy button does not work",
    })),
    toBoardRecord(buildRow({
      id: "22222222-2222-4222-8222-222222222222",
      report_type: "feature",
      status: "fixed",
      area: "Feedback",
      summary: "Add reaction option",
    })),
  ]);

  assert.match(markdown, /## Bugs/);
  assert.match(markdown, /### Confirmed/);
  assert.match(markdown, /\[11111111\] Account — Copy button does not work/);
  assert.match(markdown, /## Features/);
  assert.match(markdown, /### Completed/);
  assert.match(markdown, /\[22222222\] Feedback — Add reaction option/);
});

test("board export excludes withdrawn spam and duplicates by default", async () => {
  const rows = [
    buildRow({ id: "a", status: "new" }),
    buildRow({ id: "b", status: "withdrawn" }),
    buildRow({ id: "c", status: "spam" }),
    buildRow({ id: "d", status: "duplicate" }),
  ];

  const result = await exportFeedbackBoard({
    client: createMockClient(rows),
    args: {
      ...parseArgs([]),
      writeMarkdown: false,
      writeJson: false,
    },
  });

  assert.deepEqual(result.records.map((record) => record.id), ["a"]);
});

test("board export includes duplicates only with --include-duplicates", async () => {
  const rows = [
    buildRow({ id: "a", status: "new" }),
    buildRow({ id: "d", status: "duplicate" }),
  ];

  const result = await exportFeedbackBoard({
    client: createMockClient(rows),
    args: {
      ...parseArgs(["--include-duplicates"]),
      writeMarkdown: false,
      writeJson: false,
    },
  });

  assert.deepEqual(result.records.map((record) => record.id), ["a", "d"]);
});

test("codex draft output includes the draft-only warning", () => {
  const drafts = renderCodexDrafts([
    toBoardRecord(buildRow({
      status: "confirmed",
      report_type: "feature",
      area: "Feedback",
      summary: "Add reaction option",
    })),
  ]);

  assert.match(drafts, /^# Feedback Board Codex Drafts/m);
  assert.match(drafts, /Draft only — review before execution\./);
  assert.match(drafts, /Feedback report IDs: `11111111`/);
});

test("board export writes markdown json and optional codex drafts", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-board-"));
  const outBase = path.join(tempDir, "board");
  const draftsPath = path.join(tempDir, "codex-drafts.md");

  const result = await exportFeedbackBoard({
    client: createMockClient([
      buildRow({ status: "confirmed" }),
      buildRow({
        id: "22222222-2222-4222-8222-222222222222",
        report_type: "feature",
        status: "in_progress",
        area: "Feedback",
        summary: "Add reaction option",
      }),
    ]),
    args: {
      ...parseArgs(["--codex-drafts"]),
      out: outBase,
    },
  });

  assert.equal(fs.existsSync(`${outBase}.md`), true);
  assert.equal(fs.existsSync(`${outBase}.json`), true);
  assert.equal(fs.existsSync(draftsPath), true);
  assert.equal(result.paths.markdown, `${outBase}.md`);
  assert.equal(result.paths.json, `${outBase}.json`);
  assert.equal(result.paths.codexDrafts, draftsPath);
  assert.match(fs.readFileSync(`${outBase}.md`, "utf8"), /# Feedback Board/);
  assert.match(fs.readFileSync(draftsPath, "utf8"), /Draft only — review before execution\./);
});
