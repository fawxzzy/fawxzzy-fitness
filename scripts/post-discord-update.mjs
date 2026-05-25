import fs from "node:fs";

import { DISCORD_UPDATES_CHANNEL_ID } from "@/lib/env";
import { createDiscordChannelMessage } from "@/lib/discord/rest";
import { buildDiscordComputaFormattedUpdatePayload } from "@/lib/discord/update-post-format";

function parseArgs(argv) {
  let title = null;
  let body = null;
  let bodyFile = null;
  let apply = false;
  let dryRun = false;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") {
      apply = true;
      continue;
    }
    if (token === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (token === "--json") {
      json = true;
      continue;
    }
    if (token === "--title") {
      title = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--body") {
      body = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (token === "--body-file") {
      bodyFile = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
  }

  return { title, body, bodyFile, apply, dryRun, json };
}

function loadBody(args) {
  if (typeof args.body === "string" && args.body.trim()) {
    return args.body;
  }

  if (typeof args.bodyFile === "string" && args.bodyFile.trim()) {
    return fs.readFileSync(args.bodyFile, "utf8");
  }

  return "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const title = typeof args.title === "string" ? args.title.trim() : "";
  const body = loadBody(args).replace(/\r\n/g, "\n").trim();
  const updatesChannelId = DISCORD_UPDATES_CHANNEL_ID();

  if (!title) {
    throw new Error("Provide --title for the Discord update post.");
  }
  if (!body) {
    throw new Error("Provide --body or --body-file for the Discord update post.");
  }
  if (!updatesChannelId) {
    throw new Error("DISCORD_UPDATES_CHANNEL_ID is not configured.");
  }

  const payload = buildDiscordComputaFormattedUpdatePayload({
    title,
    description: body,
  });

  const summary = {
    apply: args.apply,
    channelId: updatesChannelId,
    title,
    payload,
  };

  if (!args.apply) {
    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`discord update dry-run -> ${title}`);
      console.log(JSON.stringify(payload, null, 2));
    }
    return;
  }

  const createResult = await createDiscordChannelMessage({
    channelId: updatesChannelId,
    body: payload,
  });
  if (!createResult.ok) {
    throw new Error(`Failed to post Discord update: ${createResult.message ?? createResult.code}`);
  }

  const result = {
    ...summary,
    messageId: createResult.messageId,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`discord update posted to <#${updatesChannelId}>`);
    console.log(`message id: ${createResult.messageId ?? "unknown"}`);
  }
}

main().catch((error) => {
  console.error(`post-discord-update failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
