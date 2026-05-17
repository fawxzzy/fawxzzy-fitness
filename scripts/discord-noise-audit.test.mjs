import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordNoiseApplyPlan,
  buildDiscordNoiseAudit,
  parseNoiseApplyArgs,
} from "./discord-server-ops-utils.mjs";

function buildSnapshot() {
  return {
    channels: [
      { id: "updates-1", name: "updates", type: 0, type_label: "text", parent_id: null, permission_overwrite_count: 1 },
      { id: "main-1", name: "main", type: 0, type_label: "text", parent_id: null, permission_overwrite_count: 1 },
      { id: "feedback-1", name: "submit-feedback", type: 0, type_label: "text", parent_id: null, permission_overwrite_count: 1 },
      { id: "forum-1", name: "feedback-board", type: 15, type_label: "forum", parent_id: null, permission_overwrite_count: 3 },
    ],
    roles: [
      { id: "role-1", name: "@everyone", permissions: "0", position: 0 },
      { id: "role-2", name: "Announcer", permissions: String(1n << 17n), position: 4 },
    ],
    configured: {
      channels: [
        { label: "updates", env: "DISCORD_UPDATES_CHANNEL_ID", id: "updates-1", channel: { id: "updates-1", name: "updates", type_label: "text" } },
        { label: "main", env: "DISCORD_MAIN_CHANNEL_ID", id: "main-1", channel: { id: "main-1", name: "main", type_label: "text" } },
      ],
      roles: [],
    },
  };
}

test("buildDiscordNoiseAudit identifies updates and main as loud channels", () => {
  const audit = buildDiscordNoiseAudit(buildSnapshot());

  assert.equal(audit.status, "warn");
  assert.deepEqual(
    audit.loud_channels.map((channel) => channel.label),
    ["updates", "main"],
  );
  assert.equal(audit.channels_for_manual_review.some((channel) => channel.id === "feedback-1"), true);
});

test("buildDiscordNoiseAudit flags roles with Mention Everyone permission", () => {
  const audit = buildDiscordNoiseAudit(buildSnapshot());
  assert.deepEqual(audit.mention_everyone_roles.map((role) => role.name), ["Announcer"]);
});

test("parseNoiseApplyArgs defaults to dry-run and apply plan does not mutate", () => {
  const args = parseNoiseApplyArgs([]);
  const plan = buildDiscordNoiseApplyPlan(buildDiscordNoiseAudit(buildSnapshot()), args);

  assert.deepEqual(args, { apply: false, debug: false });
  assert.equal(plan.mode, "dry-run");
  assert.equal(plan.mutated, false);
  assert.deepEqual(plan.mutations, []);
});
