import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  DEFAULT_MARKDOWN_OUT,
  MAX_LIMIT,
  parseArgs,
  repoRoot,
  resolveOutputPath,
  toExportRecord,
} from "./export-discord-bug-reports.mjs";

test("export parseArgs caps limit at 100", () => {
  const args = parseArgs(["--markdown", "--limit", "999"]);
  assert.equal(args.limit, MAX_LIMIT);
});

test("export default output path stays under runtime", () => {
  const outputPath = resolveOutputPath(null, "markdown");
  assert.equal(outputPath, path.join(repoRoot, DEFAULT_MARKDOWN_OUT));
});

test("export masks discord ids unless debug is passed and includes forum metadata", () => {
  process.env.DISCORD_GUILD_ID = "1504668396338413670";
  const record = {
    id: "report-1",
    report_type: "bug",
    created_at: "2026-05-15T13:00:00.000Z",
    last_seen_at: "2026-05-15T13:05:00.000Z",
    status: "confirmed",
    status_updated_at: "2026-05-15T13:06:00.000Z",
    severity: "medium",
    area: "Settings",
    reporter_member_number: 4,
    reporter_discord_user_id: "123456789012345678",
    summary: "Token copy button failed",
    details: "I tapped Copy and nothing happened.",
    steps_to_reproduce: "Open Settings -> Account -> Generate token -> tap Copy",
    screenshot_url: "https://example.com/shot.png",
    duplicate_count: 2,
    duplicate_fingerprint: "fingerprint-1",
    discord_forum_channel_id: "1504673475489562744",
    discord_forum_thread_id: "1504673475489562745",
    discord_forum_title: "Bug: Settings \u2014 Token copy button failed",
  };

  const masked = toExportRecord(record, false);
  const debug = toExportRecord(record, true);

  assert.equal(masked.reporter_discord_user_id, undefined);
  assert.equal(masked.reporter_discord_user_id_masked, "**************5678");
  assert.equal(debug.reporter_discord_user_id, "123456789012345678");
  assert.equal(masked.report_type, "bug");
  assert.equal(masked.status_updated_at, "2026-05-15T13:06:00.000Z");
  assert.equal(masked.discord_forum_title, "Bug: Settings \u2014 Token copy button failed");
  assert.equal(
    masked.discord_forum_thread_link,
    "https://discord.com/channels/1504668396338413670/1504673475489562745",
  );
});
