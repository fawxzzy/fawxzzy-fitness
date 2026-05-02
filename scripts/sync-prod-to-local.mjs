import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { parseDotenvFile } from "./env-file.mjs";

const EXPECTED_PROD_SUPABASE_PROJECT_REF = "lpswxoyfniocuhljgzbc";
const DEFAULT_DUMP_DIR = ".tmp/prod-mirror";
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const PLACEHOLDER_PATTERNS = [
  "replace-me",
  "example.invalid",
  "<",
  ">",
  "read_only_user",
  "your-",
];

function parseArgs(argv) {
  const args = {
    yes: false,
    keepDump: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--yes") {
      args.yes = true;
      continue;
    }

    if (token === "--keep-dump") {
      args.keepDump = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function usage() {
  console.log(
    [
      "Usage:",
      "  npm run db:mirror:prod-to-local -- --env .env.prod-local-mirror --yes",
      "",
      "Options:",
      "  --env <path>    Required. Separate env file for mirror credentials.",
      "  --yes           Required to perform the destructive local refresh.",
      "  --keep-dump     Keep the generated SQL dump under .tmp/prod-mirror/.",
    ].join("\n"),
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function resolveEnvPath(repoRoot, requestedPath) {
  if (!requestedPath || !String(requestedPath).trim()) {
    fail("Missing required --env <path>. Use a separate mirror env file such as .env.prod-local-mirror.");
  }

  return path.isAbsolute(requestedPath)
    ? path.normalize(requestedPath)
    : path.join(repoRoot, requestedPath);
}

function assertRequiredEnv(env, key) {
  const value = env[key]?.trim();
  if (!value) {
    fail(`Missing required env key ${key}.`);
  }

  return value;
}

function assertNoPlaceholderValue(label, value) {
  const normalized = String(value).trim().toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    fail(`${label} still contains placeholder text. Replace the example values before running the mirror.`);
  }
}

function parseDatabaseUrl(label, rawValue) {
  let parsed;

  try {
    parsed = new URL(rawValue);
  } catch (error) {
    fail(`${label} is not a valid database URL: ${error.message}`);
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    fail(`${label} must use a postgres/postgresql URL.`);
  }

  return parsed;
}

function isLocalDatabaseHost(hostname) {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

function assertCommandAvailable(command) {
  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    shell: false,
  });

  if (result.error?.code === "ENOENT") {
    fail(`Required command not found: ${command}. Install PostgreSQL client tools before running the mirror.`);
  }

  if (result.error) {
    fail(`Failed to run ${command} --version: ${result.error.message}`);
  }
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.error?.code === "ENOENT") {
    fail(`Required command not found: ${command}.`);
  }

  if (result.error) {
    fail(`Failed to run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? 1}.`);
  }
}

function buildDumpPath(repoRoot) {
  const dumpDir = path.join(repoRoot, DEFAULT_DUMP_DIR);
  fs.mkdirSync(dumpDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dumpDir, `public-data-${timestamp}.sql`);
}

function printPlan({ envPath, prodProjectRef, prodDatabaseUrl, localDatabaseUrl, dumpPath }) {
  console.log("Prod -> local mirror plan");
  console.log(`  env file: ${envPath}`);
  console.log(`  source project ref: ${prodProjectRef}`);
  console.log(`  source db host: ${prodDatabaseUrl.host}`);
  console.log(`  destination db host: ${localDatabaseUrl.host}`);
  console.log(`  schema scope: public`);
  console.log(`  dump path: ${dumpPath}`);
  console.log("");
}

function buildTruncateSql() {
  return [
    "DO $$",
    "DECLARE",
    "  r RECORD;",
    "BEGIN",
    "  FOR r IN",
    "    SELECT tablename",
    "    FROM pg_tables",
    "    WHERE schemaname = 'public'",
    "  LOOP",
    "    EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', r.tablename);",
    "  END LOOP;",
    "END $$;",
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  usage();
  process.exit(0);
}

const repoRoot = process.cwd();
const envPath = resolveEnvPath(repoRoot, args.env);

if (!fs.existsSync(envPath)) {
  fail(`Env file not found: ${envPath}`);
}

const env = parseDotenvFile(envPath);
const prodProjectRef = assertRequiredEnv(env, "PROD_SUPABASE_PROJECT_REF");
const prodDatabaseUrlRaw = assertRequiredEnv(env, "PROD_DATABASE_URL");
const localDatabaseUrlRaw = assertRequiredEnv(env, "LOCAL_DATABASE_URL");

assertNoPlaceholderValue("PROD_SUPABASE_PROJECT_REF", prodProjectRef);
assertNoPlaceholderValue("PROD_DATABASE_URL", prodDatabaseUrlRaw);
assertNoPlaceholderValue("LOCAL_DATABASE_URL", localDatabaseUrlRaw);

if (prodProjectRef !== EXPECTED_PROD_SUPABASE_PROJECT_REF) {
  fail(
    `Refusing to mirror: PROD_SUPABASE_PROJECT_REF must be ${EXPECTED_PROD_SUPABASE_PROJECT_REF}, got ${prodProjectRef}.`,
  );
}

const prodDatabaseUrl = parseDatabaseUrl("PROD_DATABASE_URL", prodDatabaseUrlRaw);
const localDatabaseUrl = parseDatabaseUrl("LOCAL_DATABASE_URL", localDatabaseUrlRaw);

if (!isLocalDatabaseHost(localDatabaseUrl.hostname)) {
  fail(
    `Refusing to mirror: LOCAL_DATABASE_URL must point to localhost, 127.0.0.1, or ::1. Got ${localDatabaseUrl.hostname}.`,
  );
}

if (isLocalDatabaseHost(prodDatabaseUrl.hostname)) {
  fail(`Refusing to mirror: PROD_DATABASE_URL points to a local host (${prodDatabaseUrl.hostname}).`);
}

if (prodDatabaseUrlRaw === localDatabaseUrlRaw) {
  fail("Refusing to mirror: PROD_DATABASE_URL and LOCAL_DATABASE_URL are identical.");
}

const dumpPath = buildDumpPath(repoRoot);
printPlan({
  envPath,
  prodProjectRef,
  prodDatabaseUrl,
  localDatabaseUrl,
  dumpPath,
});

if (!args.yes) {
  fail("Refusing to continue without --yes. This operation is destructive to local public data.");
}

assertCommandAvailable("pg_dump");
assertCommandAvailable("psql");

let shouldKeepDump = args.keepDump;

try {
  runCommand("pg_dump", [
    "--data-only",
    "--no-owner",
    "--no-privileges",
    "--schema=public",
    "--file",
    dumpPath,
    prodDatabaseUrlRaw,
  ]);

  runCommand("psql", [
    localDatabaseUrlRaw,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    buildTruncateSql(),
  ]);

  runCommand("psql", [
    localDatabaseUrlRaw,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    dumpPath,
  ]);

  console.log("");
  console.log("Local public data refresh completed.");
  console.log(`  source project ref: ${prodProjectRef}`);
  console.log(`  destination db host: ${localDatabaseUrl.host}`);
  console.log(`  restored dump: ${dumpPath}`);
} catch (error) {
  shouldKeepDump = true;
  fail(error instanceof Error ? error.message : String(error));
} finally {
  if (!shouldKeepDump && fs.existsSync(dumpPath)) {
    fs.unlinkSync(dumpPath);
  }
}
