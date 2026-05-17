#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDiscordNoiseAudit,
  fetchDiscordServerInventory,
  parseInventoryArgs,
  renderDiscordServerInventoryMarkdown,
  resolveInventoryOutputPaths,
  writeJsonArtifact,
  writeTextArtifact,
} from "./discord-server-ops-utils.mjs";

export async function runDiscordServerInventory(args = parseInventoryArgs()) {
  const snapshot = await fetchDiscordServerInventory();
  const outputPaths = resolveInventoryOutputPaths(args);

  if (outputPaths.markdown) {
    writeTextArtifact(outputPaths.markdown, renderDiscordServerInventoryMarkdown(snapshot));
  }

  if (outputPaths.json) {
    writeJsonArtifact(outputPaths.json, snapshot);
  }

  return {
    snapshot,
    outputPaths,
    noisePreview: buildDiscordNoiseAudit(snapshot),
  };
}

const entryFilePath = fileURLToPath(import.meta.url);

async function main() {
  const args = parseInventoryArgs();
  const result = await runDiscordServerInventory(args);
  console.log(`Discord inventory exported for guild ${result.snapshot.guild_id}.`);
  if (result.outputPaths.markdown) {
    console.log(`- markdown: ${result.outputPaths.markdown}`);
  }
  if (result.outputPaths.json) {
    console.log(`- json: ${result.outputPaths.json}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
