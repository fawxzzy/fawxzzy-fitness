import fs from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  DISCORD_INVENTORY_NOISE_DOC_PATH,
  parseInventoryArgs,
  renderDiscordServerInventoryMarkdown,
} from "./discord-server-ops-utils.mjs";

test("parseInventoryArgs defaults to writing markdown and json", () => {
  assert.deepEqual(parseInventoryArgs([]), {
    writeMarkdown: true,
    writeJson: true,
    out: null,
    debug: false,
  });
});

test("parseInventoryArgs supports single-format output flags", () => {
  assert.deepEqual(parseInventoryArgs(["--json", "--out", "runtime/custom.json"]), {
    writeMarkdown: false,
    writeJson: true,
    out: "runtime/custom.json",
    debug: false,
  });
});

test("renderDiscordServerInventoryMarkdown includes channels, roles, emojis, and forum tags", () => {
  const markdown = renderDiscordServerInventoryMarkdown({
    generated_at: "2026-05-17T00:00:00.000Z",
    guild_id: "guild-1",
    channels: [
      { id: "chan-1", name: "updates", type_label: "text", parent_id: null, permission_overwrite_count: 2 },
    ],
    roles: [
      { id: "role-1", name: "Verified", position: 1 },
    ],
    emojis: [
      { id: "emoji-1", name: "Bug", available: true },
    ],
    forum_tags: [
      { id: "tag-1", name: "Feature", channel_id: "forum-1", channel_name: "feedback-board" },
    ],
    configured: {
      channels: [
        { label: "updates", env: "DISCORD_UPDATES_CHANNEL_ID", id: "chan-1", channel: { id: "chan-1", name: "updates", type_label: "text" } },
      ],
      roles: [
        { label: "verified", env: "DISCORD_VERIFIED_ROLE_ID", id: "role-1", role: { id: "role-1", name: "Verified" } },
      ],
    },
  });

  assert.match(markdown, /# Discord Server Inventory/);
  assert.match(markdown, /#updates \| `chan-1` \| text/);
  assert.match(markdown, /Verified \| `role-1`/);
  assert.match(markdown, /Bug \| `emoji-1`/);
  assert.match(markdown, /Feature \| `tag-1`/);
});

test("discord inventory lane has a durable local-only operator contract", () => {
  assert.equal(fs.existsSync(DISCORD_INVENTORY_NOISE_DOC_PATH), true);
  const doc = fs.readFileSync(DISCORD_INVENTORY_NOISE_DOC_PATH, "utf8");

  assert.match(doc, /review-only snapshots for human inspection/i);
  assert.match(doc, /recommendation-only in v1/i);
  assert.match(doc, /does not mutate Discord permissions, channels, or notification settings/i);
});
