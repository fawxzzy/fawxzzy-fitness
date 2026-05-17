#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenvFile, resolveEnvFilePath } from "./env-file.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const envPath = resolveEnvFilePath(repoRoot);
const fileEnv = parseDotenvFile(envPath);
const explicitEnvFileOverride = Boolean(process.env.FITNESS_ENV_FILE?.trim());

for (const [key, value] of Object.entries(fileEnv)) {
  if (explicitEnvFileOverride || !process.env[key]) {
    process.env[key] = value;
  }
}

let moderationHelpersPromise = null;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}. Set it in ${envPath} or the current shell.`);
  }

  return value;
}

async function loadModerationHelpers() {
  if (!moderationHelpersPromise) {
    register("./test-alias-loader.mjs", pathToFileURL(`${scriptDir}${path.sep}`));
    moderationHelpersPromise = import(
      pathToFileURL(path.join(repoRoot, "src", "lib", "discord", "moderation.ts")).href
    ).then((module) => ({
      expireCase: module.expireDiscordPurgatoryCase,
      formatShortId: module.formatDiscordModerationCaseShortId,
      listExpiredCases: module.listExpiredActiveDiscordModerationCases,
    }));
  }

  return moderationHelpersPromise;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    apply: false,
    limit: 25,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--apply") {
      args.apply = true;
      continue;
    }

    if (token === "--limit") {
      const parsed = Number.parseInt(argv[index + 1] ?? "", 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        args.limit = Math.min(parsed, 100);
      }
      index += 1;
    }
  }

  return args;
}

export async function runReleaseExpiredPurgatoryCases(options = {}) {
  const args = options.args ?? parseArgs();
  const helpers = options.helpers ?? await loadModerationHelpers();
  const now = options.now ?? new Date();
  const expiredCases = await helpers.listExpiredCases({
    now,
    limit: args.limit,
  });

  if (!args.apply) {
    return {
      apply: false,
      releasedCount: 0,
      expiredCases,
      results: expiredCases.map((caseRow) => ({
        caseId: caseRow.id,
        status: "dry-run",
      })),
    };
  }

  const guildId = options.guildId ?? getRequiredEnv("DISCORD_GUILD_ID");
  const results = [];
  let releasedCount = 0;

  for (const caseRow of expiredCases) {
    const releaseResult = await helpers.expireCase({
      guildId,
      caseIdOrPrefix: caseRow.id,
      releaseNote: "Expired Purgatory case released by automation.",
    });
    results.push({
      caseId: caseRow.id,
      status: releaseResult.ok ? "released" : "failed",
      message: releaseResult.ok ? null : releaseResult.message,
    });

    if (releaseResult.ok) {
      releasedCount += 1;
    }
  }

  return {
    apply: true,
    releasedCount,
    expiredCases,
    results,
  };
}

async function main() {
  const result = await runReleaseExpiredPurgatoryCases();

  if (!result.apply) {
    console.log(`Found ${result.expiredCases.length} expired Purgatory case(s). Dry-run only; rerun with --apply to release them.`);
    for (const caseRow of result.expiredCases) {
      const helpers = await loadModerationHelpers();
      console.log(`- ${helpers.formatShortId(caseRow.id)} target=${caseRow.target_discord_user_id} expires_at=${caseRow.expires_at}`);
    }
    return;
  }

  console.log(`Released ${result.releasedCount} expired Purgatory case(s).`);
  for (const release of result.results) {
    console.log(`- ${release.caseId}: ${release.status}${release.message ? ` (${release.message})` : ""}`);
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
