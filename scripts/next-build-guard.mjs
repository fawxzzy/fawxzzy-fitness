#!/usr/bin/env node
import process from "node:process";
import {
  evaluateBuildWorkspaceGuard,
  formatGuardFailureMessage,
} from "./next-workspace-guard.mjs";

function parseArgs(argv = process.argv.slice(2)) {
  return {
    stopDev: argv.includes("--stop-dev"),
    json: argv.includes("--json"),
  };
}

async function main() {
  const flags = parseArgs();
  const guard = await evaluateBuildWorkspaceGuard({
    stopDev: flags.stopDev,
  });

  if (flags.json) {
    process.stdout.write(`${JSON.stringify(guard, null, 2)}\n`);
  } else if (guard.blocked) {
    process.stderr.write(`${formatGuardFailureMessage(guard)}\n`);
  } else {
    process.stdout.write(`${guard.message}\n`);
  }

  if (guard.blocked) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
