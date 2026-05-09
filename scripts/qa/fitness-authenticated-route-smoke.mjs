#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PROTECTED_LLEL_ROUTES, checkProtectedRoutes, resolveFitnessAppUrl } from "./fitness-auth-state.mjs";

const currentFilePath = fileURLToPath(import.meta.url);

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  const baseUrl = resolveFitnessAppUrl();
  const result = await checkProtectedRoutes({ routes: PROTECTED_LLEL_ROUTES, baseUrl });
  printJson({
    command: "qa:auth:check",
    ...result,
  });
  if (!result.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  });
}
