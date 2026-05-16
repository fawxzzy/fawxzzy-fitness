// @ts-nocheck
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDiscordUpdateLatestSummary,
  findDiscordUpdateDraftByIdOrPrefix,
  formatDiscordUpdatePublishMessage,
  publishDiscordUpdateDraft,
  skipDiscordUpdateDraft,
  upsertDiscordUpdateDraftFromVercelEvent,
} from "./update-drafts.ts";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDraftId(index) {
  return `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`;
}

function createFakeUpdateDraftAdmin(initialRows = []) {
  const state = {
    rows: initialRows.map((row) => clone(row)),
    nextId: initialRows.length + 1,
  };

  class FakeQuery {
    constructor() {
      this.mode = "select";
      this.values = null;
      this.filters = [];
      this.orderBy = null;
      this.limitValue = null;
    }

    select() {
      return this;
    }

    eq(column, value) {
      this.filters.push((row) => row[column] === value);
      return this;
    }

    gte(column, value) {
      this.filters.push((row) => String(row[column] ?? "") >= String(value));
      return this;
    }

    lte(column, value) {
      this.filters.push((row) => String(row[column] ?? "") <= String(value));
      return this;
    }

    order(column, args) {
      this.orderBy = { column, ascending: Boolean(args?.ascending) };
      return this;
    }

    limit(value) {
      this.limitValue = value;
      return this;
    }

    insert(values) {
      this.mode = "insert";
      this.values = Array.isArray(values) ? values.map((value) => clone(value)) : [clone(values)];
      return this;
    }

    update(values) {
      this.mode = "update";
      this.values = clone(values);
      return this;
    }

    async maybeSingle() {
      const rows = this.executeSelect();
      return { data: rows[0] ?? null, error: null };
    }

    async single() {
      if (this.mode === "insert") {
        const insertedRow = {
          id: createDraftId(state.nextId++),
          source: "vercel",
          status: "draft",
          deployment_id: null,
          deployment_url: null,
          production_url: null,
          vercel_project_id: null,
          vercel_project_name: null,
          vercel_target: null,
          git_commit_sha: null,
          git_commit_ref: null,
          git_commit_message: null,
          user_facing_title: null,
          user_facing_changes: null,
          user_facing_why_it_matters: null,
          discord_channel_id: null,
          discord_message_id: null,
          published_by_discord_user_id: null,
          published_at: null,
          skipped_by_discord_user_id: null,
          skipped_at: null,
          skip_reason: null,
          webhook_received_at: new Date(0).toISOString(),
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
          ...this.values[0],
        };
        state.rows.push(insertedRow);
        return { data: clone(insertedRow), error: null };
      }

      if (this.mode === "update") {
        const rows = this.executeSelect();
        const row = rows[0];
        if (!row) {
          return { data: null, error: { message: "not found" } };
        }

        Object.assign(row, clone(this.values));
        return { data: clone(row), error: null };
      }

      const rows = this.executeSelect();
      return { data: clone(rows[0] ?? null), error: null };
    }

    then(resolve, reject) {
      return Promise.resolve(this.execute()).then(resolve, reject);
    }

    execute() {
      if (this.mode === "select") {
        return { data: clone(this.executeSelect()), error: null };
      }

      return this.single();
    }

    executeSelect() {
      let rows = state.rows.filter((row) => this.filters.every((filter) => filter(row)));
      if (this.orderBy) {
        rows = [...rows].sort((left, right) => {
          const leftValue = String(left[this.orderBy.column] ?? "");
          const rightValue = String(right[this.orderBy.column] ?? "");
          if (leftValue === rightValue) {
            return 0;
          }

          const comparison = leftValue < rightValue ? -1 : 1;
          return this.orderBy.ascending ? comparison : -comparison;
        });
      }

      if (typeof this.limitValue === "number") {
        rows = rows.slice(0, this.limitValue);
      }

      return rows;
    }
  }

  return {
    state,
    client: {
      from(table) {
        assert.equal(table, "discord_update_drafts");
        return new FakeQuery();
      },
    },
  };
}

function buildProductionReadyEvent(overrides = {}) {
  return {
    type: "deployment.ready",
    payload: {
      target: "production",
      projectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
      project: {
        id: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
        name: "fawxzzy-fitness",
      },
      alias: ["fawxzzy-fitness-local.vercel.app"],
      deployment: {
        id: "dpl_123",
        url: "fawxzzy-fitness-preview.vercel.app",
        target: "production",
        name: "fawxzzy-fitness",
        meta: {
          githubCommitSha: "abcdef1234567890",
          githubCommitMessage: "internal commit message",
          githubCommitRef: "main",
        },
      },
      ...overrides,
    },
  };
}

test("preview deployment events are ignored before draft creation", async () => {
  const { client, state } = createFakeUpdateDraftAdmin();

  const result = await upsertDiscordUpdateDraftFromVercelEvent({
    event: buildProductionReadyEvent({ target: "preview" }),
    adminClient: client,
    configuredProjectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
  });

  assert.deepEqual(result, {
    ok: true,
    ignored: true,
    reason: "ignored non-production target: preview",
  });
  assert.equal(state.rows.length, 0);
});

test("non-Fitness projects are ignored when VERCEL_PROJECT_ID is configured", async () => {
  const { client, state } = createFakeUpdateDraftAdmin();

  const result = await upsertDiscordUpdateDraftFromVercelEvent({
    event: buildProductionReadyEvent({ projectId: "prj_other" }),
    adminClient: client,
    configuredProjectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
  });

  assert.deepEqual(result, {
    ok: true,
    ignored: true,
    reason: "ignored non-Fitness project: prj_other",
  });
  assert.equal(state.rows.length, 0);
});

test("production ready deployments create bounded drafts", async () => {
  const { client, state } = createFakeUpdateDraftAdmin();

  const result = await upsertDiscordUpdateDraftFromVercelEvent({
    event: buildProductionReadyEvent(),
    adminClient: client,
    configuredProjectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
  });

  assert.equal(result.ok, true);
  assert.equal(result.ignored, false);
  if (!result.ok || result.ignored) {
    throw new Error("Expected a created draft");
  }

  assert.equal(result.created, true);
  assert.equal(result.draft.status, "draft");
  assert.equal(result.draft.deployment_id, "dpl_123");
  assert.equal(result.draft.deployment_url, "https://fawxzzy-fitness-preview.vercel.app/");
  assert.equal(result.draft.production_url, "https://fawxzzy-fitness-local.vercel.app/");
  assert.equal(result.draft.git_commit_sha, "abcdef1234567890");
  assert.equal(state.rows.length, 1);
});

test("duplicate deployment ids update the existing draft without creating a duplicate", async () => {
  const { client, state } = createFakeUpdateDraftAdmin();

  const first = await upsertDiscordUpdateDraftFromVercelEvent({
    event: buildProductionReadyEvent(),
    adminClient: client,
    configuredProjectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
  });
  assert.equal(first.ok, true);
  assert.equal(first.ignored, false);
  if (!first.ok || first.ignored) {
    throw new Error("Expected first draft");
  }

  state.rows[0].user_facing_title = "Curated title stays put";

  const second = await upsertDiscordUpdateDraftFromVercelEvent({
    event: buildProductionReadyEvent({
      deployment: {
        id: "dpl_123",
        url: "fawxzzy-fitness-production.vercel.app",
        target: "production",
        name: "fawxzzy-fitness",
        meta: {
          githubCommitSha: "fedcba9876543210",
          githubCommitMessage: "second internal message",
          githubCommitRef: "main",
        },
      },
    }),
    adminClient: client,
    configuredProjectId: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
  });

  assert.equal(second.ok, true);
  assert.equal(second.ignored, false);
  if (!second.ok || second.ignored) {
    throw new Error("Expected updated draft");
  }

  assert.equal(second.created, false);
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0].deployment_url, "https://fawxzzy-fitness-production.vercel.app/");
  assert.equal(state.rows[0].git_commit_sha, "fedcba9876543210");
  assert.equal(state.rows[0].user_facing_title, "Curated title stays put");
});

test("findDiscordUpdateDraftByIdOrPrefix resolves short ids safely", async () => {
  const { client } = createFakeUpdateDraftAdmin([
    {
      id: "11111111-1111-4111-8111-111111111111",
      source: "vercel",
      status: "draft",
      deployment_id: "dpl_123",
      deployment_url: null,
      production_url: null,
      vercel_project_id: null,
      vercel_project_name: null,
      vercel_target: "production",
      git_commit_sha: null,
      git_commit_ref: null,
      git_commit_message: null,
      user_facing_title: null,
      user_facing_changes: null,
      user_facing_why_it_matters: null,
      discord_channel_id: null,
      discord_message_id: null,
      published_by_discord_user_id: null,
      published_at: null,
      skipped_by_discord_user_id: null,
      skipped_at: null,
      skip_reason: null,
      webhook_received_at: "2026-05-16T11:00:00.000Z",
      created_at: "2026-05-16T11:00:00.000Z",
      updated_at: "2026-05-16T11:00:00.000Z",
    },
  ]);

  const result = await findDiscordUpdateDraftByIdOrPrefix({
    draftIdOrPrefix: "11111111",
    adminClient: client,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected draft lookup");
  }
  assert.equal(result.draft.id, "11111111-1111-4111-8111-111111111111");
});

test("buildDiscordUpdateLatestSummary renders the latest drafts without raw payloads", () => {
  const content = buildDiscordUpdateLatestSummary([
    {
      id: "11111111-1111-4111-8111-111111111111",
      source: "vercel",
      status: "draft",
      deployment_id: "dpl_123",
      deployment_url: "https://preview.vercel.app/",
      production_url: "https://fawxzzy-fitness-local.vercel.app/",
      vercel_project_id: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
      vercel_project_name: "fawxzzy-fitness",
      vercel_target: "production",
      git_commit_sha: "abcdef1234567890",
      git_commit_ref: "main",
      git_commit_message: "internal raw message",
      user_facing_title: "New feedback tools are live",
      user_facing_changes: null,
      user_facing_why_it_matters: null,
      discord_channel_id: null,
      discord_message_id: null,
      published_by_discord_user_id: null,
      published_at: null,
      skipped_by_discord_user_id: null,
      skipped_at: null,
      skip_reason: null,
      webhook_received_at: "2026-05-16T11:00:00.000Z",
      created_at: "2026-05-16T11:00:00.000Z",
      updated_at: "2026-05-16T11:00:00.000Z",
    },
  ]);

  assert.match(content, /Latest production update drafts:/);
  assert.match(content, /abcdef123456/);
  assert.doesNotMatch(content, /internal raw message/);
});

test("publish rejects empty curated copy", async () => {
  const { client } = createFakeUpdateDraftAdmin();

  const result = await publishDiscordUpdateDraft({
    draftIdOrPrefix: "11111111",
    title: "",
    whatChanged: "",
    whyItMatters: "",
    publishedByDiscordUserId: "123456789012345678",
    discordChannelId: "1504671871512346695",
    adminClient: client,
  });

  assert.deepEqual(result, { ok: false, code: "DISCORD_UPDATE_DRAFT_INVALID_INPUT" });
});

test("publish posts to DISCORD_UPDATES_CHANNEL_ID with curated copy only", async () => {
  const { client, state } = createFakeUpdateDraftAdmin([
    {
      id: "11111111-1111-4111-8111-111111111111",
      source: "vercel",
      status: "draft",
      deployment_id: "dpl_123",
      deployment_url: "https://preview.vercel.app/",
      production_url: "https://fawxzzy-fitness-local.vercel.app/",
      vercel_project_id: "prj_rtlFVOMFAWCRoJ3SQjHloi89881K",
      vercel_project_name: "fawxzzy-fitness",
      vercel_target: "production",
      git_commit_sha: "abcdef1234567890",
      git_commit_ref: "main",
      git_commit_message: "internal raw message",
      user_facing_title: null,
      user_facing_changes: null,
      user_facing_why_it_matters: null,
      discord_channel_id: null,
      discord_message_id: null,
      published_by_discord_user_id: null,
      published_at: null,
      skipped_by_discord_user_id: null,
      skipped_at: null,
      skip_reason: null,
      webhook_received_at: "2026-05-16T11:00:00.000Z",
      created_at: "2026-05-16T11:00:00.000Z",
      updated_at: "2026-05-16T11:00:00.000Z",
    },
  ]);

  const observedMessages = [];
  const result = await publishDiscordUpdateDraft({
    draftIdOrPrefix: "11111111",
    title: "Better feedback tools are live",
    whatChanged: "- Submit feedback from one panel\n- Add more detail to your own report",
    whyItMatters: "It is easier to report bugs and feature requests without memorizing commands.",
    publishedByDiscordUserId: "123456789012345678",
    discordChannelId: "1504671871512346695",
    adminClient: client,
    dependencies: {
      createMessage: async ({ channelId, body }) => {
        observedMessages.push({ channelId, body });
        return { ok: true, messageId: "1505000000000000001" };
      },
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected publish success");
  }

  assert.equal(observedMessages[0]?.channelId, "1504671871512346695");
  assert.match(observedMessages[0]?.body?.content ?? "", /## Better feedback tools are live/);
  assert.doesNotMatch(observedMessages[0]?.body?.content ?? "", /\*\*Better feedback tools are live\*\*/);
  assert.equal(observedMessages[0]?.body?.flags, 4);
  assert.doesNotMatch(observedMessages[0]?.body?.content ?? "", /abcdef1234567890/);
  assert.doesNotMatch(observedMessages[0]?.body?.content ?? "", /internal raw message/);
  assert.equal(state.rows[0]?.status, "published");
  assert.equal(state.rows[0]?.discord_message_id, "1505000000000000001");
});

test("skip updates draft status and stores a bounded reason", async () => {
  const { client, state } = createFakeUpdateDraftAdmin([
    {
      id: "11111111-1111-4111-8111-111111111111",
      source: "vercel",
      status: "draft",
      deployment_id: "dpl_123",
      deployment_url: null,
      production_url: null,
      vercel_project_id: null,
      vercel_project_name: null,
      vercel_target: "production",
      git_commit_sha: null,
      git_commit_ref: null,
      git_commit_message: null,
      user_facing_title: null,
      user_facing_changes: null,
      user_facing_why_it_matters: null,
      discord_channel_id: null,
      discord_message_id: null,
      published_by_discord_user_id: null,
      published_at: null,
      skipped_by_discord_user_id: null,
      skipped_at: null,
      skip_reason: null,
      webhook_received_at: "2026-05-16T11:00:00.000Z",
      created_at: "2026-05-16T11:00:00.000Z",
      updated_at: "2026-05-16T11:00:00.000Z",
    },
  ]);

  const result = await skipDiscordUpdateDraft({
    draftIdOrPrefix: "11111111",
    skippedByDiscordUserId: "123456789012345678",
    reason: "Internal-only infrastructure work.",
    adminClient: client,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected skip success");
  }

  assert.equal(state.rows[0]?.status, "skipped");
  assert.equal(state.rows[0]?.skip_reason, "Internal-only infrastructure work.");
});

test("formatDiscordUpdatePublishMessage keeps the public post user-facing", () => {
  const message = formatDiscordUpdatePublishMessage({
    title: "Faster feedback flow",
    whatChanged: "- Add one panel for feedback\n- Keep status replies compact",
    whyItMatters: "You can submit and track feedback from Discord without command hunting.",
  });

  assert.match(message, /^@everyone\n\n## Faster feedback flow/m);
  assert.match(message, /^## Faster feedback flow/m);
  assert.match(message, /\*\*What changed\*\*/);
  assert.match(message, /\*\*Why it matters\*\*/);
  assert.match(message, /Open Fitness:\n<https:\/\/fawxzzy-fitness-local\.vercel\.app\/login>/);
  assert.doesNotMatch(message, /githubCommitSha/);
  assert.doesNotMatch(message, /migration/);
});

test("formatDiscordUpdatePublishMessage does not duplicate the default title", () => {
  const message = formatDiscordUpdatePublishMessage({
    title: "Fitness App Update",
    whatChanged: "Improved the Discord feedback flow.\nAdded a cleaner Feedback forum board.",
    whyItMatters: "Updates should be easier to read and focused on what changed for users.",
  });

  assert.equal((message.match(/Fitness App Update/g) ?? []).length, 1);
  assert.match(message, /^@everyone/m);
  assert.match(message, /^## Fitness App Update/m);
  assert.match(message, /\n- Improved the Discord feedback flow\.\n- Added a cleaner Feedback forum board\./);
});

test("formatDiscordUpdatePublishMessage defaults a blank title and avoids double bullets", () => {
  const message = formatDiscordUpdatePublishMessage({
    title: "   ",
    whatChanged: "- Improved the feedback post format.\n* Cleaned up update announcements.\n3. Reduced link preview clutter.",
    whyItMatters: "Updates should be easier to read and focused on what changed for users.",
  });

  assert.match(message, /^@everyone/m);
  assert.match(message, /^## Fitness App Update/m);
  assert.match(message, /\n- Improved the feedback post format\.\n- Cleaned up update announcements\.\n- Reduced link preview clutter\./);
  assert.doesNotMatch(message, /\n- - /);
});
