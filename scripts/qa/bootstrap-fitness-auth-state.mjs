#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  checkProtectedRoutes,
  getAuthEnvReport,
  resolveFitnessAppUrl,
  signInFitnessQaUser,
  writeAuthState,
} from "./fitness-auth-state.mjs";

const currentFilePath = fileURLToPath(import.meta.url);

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    account: argv.includes("--zac") ? "zac" : "qa",
  };
}

async function main() {
  const args = parseArgs();
  const report = getAuthEnvReport({ account: args.account });
  if (report.missing.length > 0) {
    printJson({
      command: "qa:auth:bootstrap",
      ok: false,
      account: args.account,
      missingEnv: report.missing,
      baseUrl: report.baseUrl,
      reason: "Missing required auth env. No secrets were printed.",
    });
    process.exitCode = 1;
    return;
  }

  const baseUrl = resolveFitnessAppUrl();
  const signedIn = await signInFitnessQaUser({ account: args.account });
  const { summary } = await writeAuthState({ ...signedIn, baseUrl });
  const routeCheck = await checkProtectedRoutes({ routes: ["/today"], baseUrl });

  printJson({
    command: "qa:auth:bootstrap",
    ok: routeCheck.ok,
    account: args.account,
    email: summary.email,
    userId: summary.userId,
    baseUrl,
    storageStatePath: summary.storageStatePath,
    summaryPath: summary.storageStatePath.replace("qa-storage-state.json", "qa-auth-summary.json"),
    expiresAt: summary.expiresAt,
    verify: routeCheck.routes,
  });

  if (!routeCheck.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
