import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  buildEmojiBootstrapSummary,
  DISCORD_EMOJI_ASSET_SPECS,
  executeEmojiBootstrap,
  getDiscordEmojiEnvVarName,
  parseArgs,
  prepareEmojiAsset,
  resolveEmojiMode,
} from "./bootstrap-discord-emojis.mjs";

test("env var mapping stays stable for supported emoji names", () => {
  assert.equal(getDiscordEmojiEnvVarName("Bug"), "DISCORD_FEEDBACK_BUG_EMOJI_ID");
  assert.equal(getDiscordEmojiEnvVarName("Feature"), "DISCORD_FEEDBACK_FEATURE_EMOJI_ID");
  assert.equal(getDiscordEmojiEnvVarName("FawxzzyLogo"), "DISCORD_FAWXZZY_LOGO_EMOJI_ID");
  assert.equal(getDiscordEmojiEnvVarName("FawxzzyLogoWhite"), "DISCORD_FAWXZZY_LOGO_WHITE_EMOJI_ID");
});

test("application mode is the default and falls back to guild only when the default cannot resolve an application id", () => {
  const defaultMode = resolveEmojiMode({
    requestedMode: null,
    applicationId: "1504700208251146371",
    guildId: "1504668396338413670",
  });
  assert.equal(defaultMode.mode, "application");
  assert.equal(defaultMode.fellBack, false);

  const fallbackMode = resolveEmojiMode({
    requestedMode: null,
    applicationId: null,
    guildId: "1504668396338413670",
  });
  assert.equal(fallbackMode.mode, "guild");
  assert.equal(fallbackMode.fellBack, true);

  assert.throws(() => resolveEmojiMode({
    requestedMode: "application",
    applicationId: null,
    guildId: "1504668396338413670",
  }));
});

test("dry-run does not call create or delete helpers", async () => {
  let createCalls = 0;
  let deleteCalls = 0;

  const result = await executeEmojiBootstrap({
    apply: false,
    replace: false,
    mode: "application",
    applicationId: "1504700208251146371",
  }, {
    listExistingEmojis: async () => [],
    prepareEmojiAsset: async ({ filePath }) => ({
      filePath,
      uploadSizeBytes: 1024,
      imageData: "data:image/png;base64,ZmFrZQ==",
    }),
    createEmoji: async () => {
      createCalls += 1;
      return { id: "should-not-happen" };
    },
    deleteEmoji: async () => {
      deleteCalls += 1;
    },
  });

  assert.equal(createCalls, 0);
  assert.equal(deleteCalls, 0);
  assert.equal(result.rows.length, DISCORD_EMOJI_ASSET_SPECS.length);
  assert.ok(result.rows.every((row) => row.action === "would-create"));
});

test("apply mode calls the expected create helper", async () => {
  const created = [];

  const result = await executeEmojiBootstrap({
    apply: true,
    replace: false,
    mode: "application",
    applicationId: "1504700208251146371",
  }, {
    listExistingEmojis: async () => [],
    prepareEmojiAsset: async ({ filePath }) => ({
      filePath,
      uploadSizeBytes: 1024,
      imageData: "data:image/png;base64,ZmFrZQ==",
    }),
    createEmoji: async ({ name }) => {
      created.push(name);
      return { id: `${name}-id` };
    },
  });

  assert.deepEqual(created, ["Bug", "Feature", "FawxzzyLogo", "FawxzzyLogoWhite"]);
  assert.equal(result.rows[0].emojiId, "Bug-id");
  assert.equal(result.rows.at(-1).emojiId, "FawxzzyLogoWhite-id");
});

test("prepareEmojiAsset resizes oversized images down to an emoji-safe payload", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "discord-emoji-bootstrap-"));
  const assetPath = path.join(tempDir, "Bug.png");
  const largeBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  await fs.writeFile(assetPath, largeBuffer);

  try {
    const asset = await prepareEmojiAsset({ filePath: assetPath });
    assert.equal(asset.mimeType, "image/png");
    assert.ok(asset.uploadSizeBytes <= 256 * 1024);
    assert.match(asset.imageData, /^data:image\/png;base64,/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("summary output reports ids without leaking secrets", () => {
  const summary = buildEmojiBootstrapSummary({
    mode: "application",
    fellBack: false,
    apply: true,
    replace: false,
    rows: [
      {
        name: "Bug",
        action: "created",
        emojiId: "1505007702924066916",
        envVarName: "DISCORD_FEEDBACK_BUG_EMOJI_ID",
      },
    ],
    envTemplatePath: null,
  });

  assert.match(summary, /DISCORD_FEEDBACK_BUG_EMOJI_ID=1505007702924066916/);
  assert.doesNotMatch(summary, /discord-bot-token|Bot /i);
});

test("parseArgs reads mode and env template flags", () => {
  const parsed = parseArgs(["--apply", "--replace", "--mode", "guild", "--write-env-template", "--env-output", "tmp/custom.env"]);
  assert.deepEqual(parsed, {
    apply: true,
    replace: true,
    writeEnvTemplate: true,
    envOutputPath: "tmp/custom.env",
    mode: "guild",
  });
});
