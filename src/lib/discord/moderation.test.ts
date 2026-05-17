// @ts-nocheck
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  formatDiscordModerationCaseShortId,
  moveDiscordUserToPurgatory,
  parseDiscordModerationDuration,
  releaseDiscordPurgatoryCase,
} from "./moderation.ts";

function createAdminClient() {
  const moderationCases = [];
  const memberLinks = [
    {
      discord_user_id: "123456789012345678",
      fitness_user_id: "00000000-0000-0000-0000-000000000123",
      user_number: 42,
    },
  ];

  function normalizeCaseRow(row) {
    return {
      removed_role_ids: [],
      restored_role_ids: [],
      target_discord_username: null,
      target_fitness_user_id: null,
      target_member_number: null,
      moderator_discord_username: null,
      duration_seconds: null,
      expires_at: null,
      purgatory_role_id: null,
      purgatory_channel_id: null,
      log_channel_id: null,
      log_message_id: null,
      release_note: null,
      released_by_discord_user_id: null,
      released_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...row,
    };
  }

  return {
    moderationCases,
    from(table) {
      if (table === "discord_member_links") {
        const state = {
          filters: [],
        };
        return {
          select() {
            return {
              eq(column, value) {
                state.filters.push([column, value]);
                return this;
              },
              async maybeSingle() {
                const match = memberLinks.find((row) => state.filters.every(([column, value]) => row[column] === value)) ?? null;
                return { data: match, error: null };
              },
            };
          },
        };
      }

      const state = {
        filters: [],
        orderColumn: "created_at",
        ascending: false,
        limitValue: null,
        updatePatch: null,
      };

      const applyFilters = () => moderationCases.filter((row) => state.filters.every(([column, value]) => row[column] === value));
      const sortRows = (rows) => [...rows].sort((left, right) => {
        const leftValue = left[state.orderColumn];
        const rightValue = right[state.orderColumn];
        if (leftValue === rightValue) {
          return 0;
        }
        return state.ascending
          ? String(leftValue).localeCompare(String(rightValue))
          : String(rightValue).localeCompare(String(leftValue));
      });

      return {
        select() {
          return {
            eq(column, value) {
              state.filters.push([column, value]);
              return this;
            },
            order(column, options) {
              state.orderColumn = column;
              state.ascending = Boolean(options?.ascending);
              return this;
            },
            async limit(limit) {
              const rows = sortRows(applyFilters()).slice(0, limit);
              return { data: rows, error: null };
            },
          };
        },
        insert(row) {
          const inserted = normalizeCaseRow({
            id: row.id ?? `00000000-0000-4000-8000-${String(moderationCases.length + 1).padStart(12, "0")}`,
            ...row,
          });
          moderationCases.push(inserted);
          return {
            select() {
              return {
                async single() {
                  return { data: inserted, error: null };
                },
              };
            },
          };
        },
        update(patch) {
          state.updatePatch = patch;
          return {
            eq(column, value) {
              const row = moderationCases.find((entry) => entry[column] === value) ?? null;
              if (row && state.updatePatch) {
                Object.assign(row, state.updatePatch);
              }
              return {
                select() {
                  return {
                    async single() {
                      return { data: row, error: row ? null : { message: "not found" } };
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
}

function createModerationDependencies() {
  const adminClient = createAdminClient();
  const members = new Map([
    ["1504700208251146371", {
      user: { id: "1504700208251146371", username: "Fawx Security" },
      roles: ["1504700208251146372"],
    }],
    ["123456789012345678", {
      user: { id: "123456789012345678", username: "target-user" },
      roles: ["1504700208251146378", "1504700208251146377"],
    }],
  ]);
  const channels = [
    { id: "1504700208251146374", name: "Purgatory", type: 4 },
    { id: "1504700208251146375", name: "purgatory", type: 0, parent_id: "1504700208251146374" },
    { id: "1504700208251146376", name: "mod-log", type: 0 },
  ];
  const roles = [
    { id: "1504668396338413670", name: "@everyone", permissions: "0", position: 0 },
    { id: "1504700208251146378", name: "Verified", permissions: "0", position: 1 },
    { id: "1504700208251146377", name: "Access", permissions: "0", position: 2 },
    { id: "1504700208251146373", name: "Purgatory", permissions: "0", position: 3 },
    { id: "1504700208251146372", name: "Bot", permissions: "0", position: 10 },
  ];
  const addRoleCalls = [];
  const removeRoleCalls = [];
  const messages = [];

  const dependencies = {
    adminClient,
    fetchGuild: async () => ({ ok: true, guild: { id: "1504668396338413670", owner_id: "owner-1" } }),
    fetchGuildRoles: async () => ({ ok: true, roles }),
    fetchGuildChannels: async () => ({ ok: true, channels }),
    fetchChannel: async ({ channelId }) => {
      const channel = channels.find((entry) => entry.id === channelId);
      return channel
        ? { ok: true, channel }
        : { ok: false, code: "NOT_FOUND", status: 404, message: "missing" };
    },
    fetchGuildMember: async ({ userId }) => {
      const member = members.get(userId);
      return member
        ? { ok: true, member }
        : { ok: false, code: "NOT_FOUND", status: 404, message: "missing" };
    },
    createRole: async () => ({ ok: true, role: { id: "1504700208251146373", name: "Purgatory", permissions: "0", position: 3 } }),
    createChannel: async ({ name, type, parentId }) => ({
      ok: true,
      channel: { id: `${name}-${type}`, name, type, parent_id: parentId ?? null },
    }),
    updatePermissionOverwrite: async () => ({ ok: true }),
    addMemberRole: async ({ userId, roleId }) => {
      addRoleCalls.push({ userId, roleId });
      const member = members.get(userId);
      if (member && !member.roles.includes(roleId)) {
        member.roles.push(roleId);
      }
      return { ok: true };
    },
    removeMemberRole: async ({ userId, roleId }) => {
      removeRoleCalls.push({ userId, roleId });
      const member = members.get(userId);
      if (member) {
        member.roles = member.roles.filter((entry) => entry !== roleId);
      }
      return { ok: true };
    },
    createMessage: async ({ channelId, body }) => {
      messages.push({ channelId, body });
      return { ok: true, messageId: `${channelId}-message-${messages.length}` };
    },
  };

  return {
    dependencies,
    adminClient,
    members,
    addRoleCalls,
    removeRoleCalls,
    messages,
  };
}

test("parseDiscordModerationDuration parses supported values", () => {
  assert.deepEqual(parseDiscordModerationDuration("10m"), { ok: true, durationSeconds: 600 });
  assert.deepEqual(parseDiscordModerationDuration("1h"), { ok: true, durationSeconds: 3600 });
  assert.deepEqual(parseDiscordModerationDuration("1d"), { ok: true, durationSeconds: 86400 });
  assert.equal(parseDiscordModerationDuration("forever").ok, false);
});

test("moveDiscordUserToPurgatory records a case and changes reversible roles", async () => {
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_PURGATORY_ROLE_ID = "1504700208251146373";
  process.env.DISCORD_PURGATORY_CATEGORY_ID = "1504700208251146374";
  process.env.DISCORD_PURGATORY_CHANNEL_ID = "1504700208251146375";
  process.env.DISCORD_MOD_LOG_CHANNEL_ID = "1504700208251146376";
  process.env.DISCORD_PURGATORY_REMOVED_ROLE_IDS = "1504700208251146377";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700208251146378";

  const context = createModerationDependencies();
  const result = await moveDiscordUserToPurgatory({
    guildId: "1504668396338413670",
    targetDiscordUserId: "123456789012345678",
    moderatorDiscordUserId: "222222222222222222",
    moderatorDiscordUsername: "staffer",
    moderatorPermissions: String(BigInt(1) << BigInt(28)),
    reason: "Repeated harassment",
    durationSeconds: 3600,
    dependencies: context.dependencies,
  });

  assert.equal(result.ok, true);
  assert.equal(context.adminClient.moderationCases.length, 1);
  assert.deepEqual(context.adminClient.moderationCases[0].removed_role_ids.sort(), ["1504700208251146377", "1504700208251146378"]);
  assert.deepEqual(context.addRoleCalls[0], {
    userId: "123456789012345678",
    roleId: "1504700208251146373",
  });
  assert.deepEqual(context.removeRoleCalls.map((call) => call.roleId).sort(), ["1504700208251146377", "1504700208251146378"]);
  assert.equal(context.members.get("123456789012345678")?.roles.includes("1504700208251146373"), true);
  assert.equal(context.messages.length >= 1, true);
});

test("moveDiscordUserToPurgatory rejects the owner and the bot", async () => {
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_PURGATORY_ROLE_ID = "1504700208251146373";
  process.env.DISCORD_PURGATORY_CATEGORY_ID = "1504700208251146374";
  process.env.DISCORD_PURGATORY_CHANNEL_ID = "1504700208251146375";
  process.env.DISCORD_MOD_LOG_CHANNEL_ID = "1504700208251146376";
  process.env.DISCORD_PURGATORY_REMOVED_ROLE_IDS = "1504700208251146377";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700208251146378";

  const ownerContext = createModerationDependencies();
  ownerContext.dependencies.fetchGuild = async () => ({
    ok: true,
    guild: { id: "1504668396338413670", owner_id: "123456789012345678" },
  });

  const ownerResult = await moveDiscordUserToPurgatory({
    guildId: "1504668396338413670",
    targetDiscordUserId: "123456789012345678",
    moderatorDiscordUserId: "222222222222222222",
    moderatorPermissions: String(BigInt(1) << BigInt(28)),
    reason: "Nope",
    durationSeconds: null,
    dependencies: ownerContext.dependencies,
  });

  assert.equal(ownerResult.ok, false);
  assert.match(ownerResult.message, /server owner/i);

  const botContext = createModerationDependencies();
  const botResult = await moveDiscordUserToPurgatory({
    guildId: "1504668396338413670",
    targetDiscordUserId: "1504700208251146371",
    moderatorDiscordUserId: "222222222222222222",
    moderatorPermissions: String(BigInt(1) << BigInt(28)),
    reason: "Nope",
    durationSeconds: null,
    dependencies: botContext.dependencies,
  });

  assert.equal(botResult.ok, false);
  assert.match(botResult.message, /bot/i);
});

test("releaseDiscordPurgatoryCase restores roles and closes the case", async () => {
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_PURGATORY_ROLE_ID = "1504700208251146373";
  process.env.DISCORD_PURGATORY_CATEGORY_ID = "1504700208251146374";
  process.env.DISCORD_PURGATORY_CHANNEL_ID = "1504700208251146375";
  process.env.DISCORD_MOD_LOG_CHANNEL_ID = "1504700208251146376";
  process.env.DISCORD_PURGATORY_REMOVED_ROLE_IDS = "1504700208251146377";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700208251146378";

  const context = createModerationDependencies();
  await moveDiscordUserToPurgatory({
    guildId: "1504668396338413670",
    targetDiscordUserId: "123456789012345678",
    moderatorDiscordUserId: "222222222222222222",
    moderatorDiscordUsername: "staffer",
    moderatorPermissions: String(BigInt(1) << BigInt(28)),
    reason: "Cooldown",
    durationSeconds: null,
    dependencies: context.dependencies,
  });

  const caseId = context.adminClient.moderationCases[0].id;
  const releaseResult = await releaseDiscordPurgatoryCase({
    guildId: "1504668396338413670",
    releasedByDiscordUserId: "333333333333333333",
    releasedByDiscordUsername: "admin",
    caseIdOrPrefix: formatDiscordModerationCaseShortId(caseId),
    releaseNote: "Cleared after review",
    dependencies: context.dependencies,
  });

  assert.equal(releaseResult.ok, true);
  assert.equal(context.adminClient.moderationCases[0].status, "released");
  assert.deepEqual(context.adminClient.moderationCases[0].restored_role_ids.sort(), ["1504700208251146377", "1504700208251146378"]);
  assert.equal(context.members.get("123456789012345678")?.roles.includes("1504700208251146373"), false);
});

test("releaseDiscordPurgatoryCase skips missing roles safely", async () => {
  process.env.DISCORD_APPLICATION_ID = "1504700208251146371";
  process.env.DISCORD_PURGATORY_ROLE_ID = "1504700208251146373";
  process.env.DISCORD_PURGATORY_CATEGORY_ID = "1504700208251146374";
  process.env.DISCORD_PURGATORY_CHANNEL_ID = "1504700208251146375";
  process.env.DISCORD_MOD_LOG_CHANNEL_ID = "1504700208251146376";
  process.env.DISCORD_PURGATORY_REMOVED_ROLE_IDS = "1504700208251146377";
  process.env.DISCORD_VERIFIED_ROLE_ID = "1504700208251146378";

  const context = createModerationDependencies();
  await moveDiscordUserToPurgatory({
    guildId: "1504668396338413670",
    targetDiscordUserId: "123456789012345678",
    moderatorDiscordUserId: "222222222222222222",
    moderatorDiscordUsername: "staffer",
    moderatorPermissions: String(BigInt(1) << BigInt(28)),
    reason: "Cooldown",
    durationSeconds: null,
    dependencies: context.dependencies,
  });

  context.dependencies.fetchGuildRoles = async () => ({
    ok: true,
    roles: [
      { id: "1504668396338413670", name: "@everyone", permissions: "0", position: 0 },
      { id: "1504700208251146373", name: "Purgatory", permissions: "0", position: 3 },
      { id: "1504700208251146372", name: "Bot", permissions: "0", position: 10 },
    ],
  });

  const releaseResult = await releaseDiscordPurgatoryCase({
    guildId: "1504668396338413670",
    releasedByDiscordUserId: "333333333333333333",
    caseIdOrPrefix: context.adminClient.moderationCases[0].id,
    dependencies: context.dependencies,
  });

  assert.equal(releaseResult.ok, true);
  assert.match(releaseResult.warnings.join(" "), /Skipped missing role/);
  assert.deepEqual(context.adminClient.moderationCases[0].restored_role_ids, []);
});

test("moderation path does not reference bans kicks or message deletes", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const moderationSource = fs.readFileSync(path.join(currentDir, "moderation.ts"), "utf8");

  assert.doesNotMatch(moderationSource, /\/bans\b/i);
  assert.doesNotMatch(moderationSource, /\bkick\b/i);
  assert.doesNotMatch(moderationSource, /deleteDiscordChannel\(/);
});
