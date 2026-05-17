#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDiscordNoiseApplyPlan,
  buildDiscordNoiseAudit,
  fetchDiscordServerInventory,
  parseNoiseApplyArgs,
} from "./discord-server-ops-utils.mjs";

export async function runDiscordNoiseApply(args = parseNoiseApplyArgs()) {
  const snapshot = await fetchDiscordServerInventory();
  const audit = buildDiscordNoiseAudit(snapshot);
  const plan = buildDiscordNoiseApplyPlan(audit, args);

  return {
    snapshot,
    audit,
    plan,
  };
}

const entryFilePath = fileURLToPath(import.meta.url);

async function main() {
  const args = parseNoiseApplyArgs();
  const result = await runDiscordNoiseApply(args);
  console.log(`Discord noise apply mode: ${result.plan.mode}`);
  console.log(result.plan.note);
  if (result.plan.recommendations.length > 0) {
    console.log("Recommendations:");
    for (const recommendation of result.plan.recommendations) {
      console.log(`- ${recommendation}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === entryFilePath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
