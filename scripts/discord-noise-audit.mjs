#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDiscordNoiseAudit,
  fetchDiscordServerInventory,
  parseInventoryArgs,
  renderDiscordNoiseAuditMarkdown,
  resolveNoiseOutputPaths,
  writeJsonArtifact,
  writeTextArtifact,
} from "./discord-server-ops-utils.mjs";

export async function runDiscordNoiseAudit(args = parseInventoryArgs()) {
  const snapshot = await fetchDiscordServerInventory();
  const audit = buildDiscordNoiseAudit(snapshot);
  const outputPaths = resolveNoiseOutputPaths(args);

  if (outputPaths.markdown) {
    writeTextArtifact(outputPaths.markdown, renderDiscordNoiseAuditMarkdown(audit));
  }

  if (outputPaths.json) {
    writeJsonArtifact(outputPaths.json, audit);
  }

  return {
    snapshot,
    audit,
    outputPaths,
  };
}

const entryFilePath = fileURLToPath(import.meta.url);

async function main() {
  const args = parseInventoryArgs();
  const result = await runDiscordNoiseAudit(args);
  console.log(`Discord noise audit status: ${result.audit.status.toUpperCase()}`);
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
