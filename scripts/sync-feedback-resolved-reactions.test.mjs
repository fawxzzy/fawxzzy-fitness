import assert from "node:assert/strict";
import test from "node:test";
import {
  DISCORD_RESOLVED_REACTION_EMOJI,
  parseArgs,
  syncResolvedReactions,
} from "./sync-feedback-resolved-reactions.mjs";

test("parseArgs keeps dry-run by default and supports targeted filters", () => {
  const args = parseArgs(["--report-id", "d1a33905", "--limit", "5", "--status", "fixed,closed", "--debug"]);
  assert.equal(args.apply, false);
  assert.equal(args.reportId, "d1a33905");
  assert.equal(args.limit, 5);
  assert.deepEqual(args.statuses, ["fixed", "closed"]);
  assert.equal(args.debug, true);
});

test("syncResolvedReactions dry-run reports actionable resolved cards without mutating", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";

  const requests = [];
  const logs = [];

  const summary = await syncResolvedReactions(
    parseArgs(["--report-id", "d1a33905"]),
    {
      fetchImpl: async (input, init) => {
        requests.push({ url: String(input), method: String(init?.method ?? "GET") });
        return new Response(JSON.stringify([
          {
            id: "d1a33905",
            status: "fixed",
            discord_forum_thread_id: "1505318951146491934",
            discord_forum_message_id: "1505318951146491934",
          },
        ]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      logger: {
        log: (message) => logs.push(message),
        warn: (message) => logs.push(message),
      },
    },
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, "GET");
  assert.equal(summary.apply, false);
  assert.equal(summary.actionableReports, 1);
  assert.equal(summary.attempted, 0);
  assert.match(String(logs[0] ?? ""), /dry-run/);
});

test("syncResolvedReactions apply uses the encoded Unicode checkmark path", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.DISCORD_BOT_TOKEN = "discord-bot-token";

  const requests = [];

  const summary = await syncResolvedReactions(
    parseArgs(["--apply", "--report-id", "d1a33905"]),
    {
      fetchImpl: async (input, init) => {
        requests.push({ url: String(input), method: String(init?.method ?? "GET") });
        const url = new URL(String(input));
        if (url.hostname === "example.supabase.co") {
          return new Response(JSON.stringify([
            {
              id: "d1a33905",
              status: "fixed",
              discord_forum_thread_id: "1505318951146491934",
              discord_forum_message_id: "1505318951146491934",
            },
          ]), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(null, { status: 204 });
      },
      logger: {
        log: () => {},
        warn: () => {},
      },
    },
  );

  assert.equal(summary.applied, 1);
  assert.equal(summary.failed, 0);
  assert.equal(
    requests.some((request) => request.url.endsWith(`/reactions/${encodeURIComponent(DISCORD_RESOLVED_REACTION_EMOJI)}/@me`) && request.method === "PUT"),
    true,
  );
});
