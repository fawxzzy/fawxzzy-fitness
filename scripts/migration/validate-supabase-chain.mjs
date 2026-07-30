import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenvFile } from "../env-file.mjs";

const MIGRATION_VERSION = /^\d+$/u;
const MIGRATION_FILENAME = /^\d+_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$/u;
const MIGRATION_LIST_KEYS = ["message", "migrations"];
const MIGRATION_LIST_ROW_KEYS = ["local", "remote", "time"];
const DRY_RUN_KEYS = ["dryRun", "message", "migrations", "roles", "seeds", "upToDate"];
const MIGRATION_LIST_ARGS = [
  "supabase",
  "migration",
  "list",
  "--linked",
  "--output-format",
  "json",
];
const DRY_RUN_ARGS = [
  "supabase",
  "db",
  "push",
  "--dry-run",
  "--linked",
  "--output-format",
  "json",
];
const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const atlasRoot = path.resolve(repoRoot, "..", "..");
const LOCAL_REMOTE_DB_ENV_PATH = path.join(atlasRoot, "secrets", "local", "fawxzzy-fitness-prod-db.env");
const EXPECTED_PROJECT_REF = "lpswxoyfniocuhljgzbc";

function quoteWindowsArg(value) {
  const normalized = String(value);
  if (!/[\s"]/u.test(normalized)) {
    return normalized;
  }

  return `"${normalized.replace(/"/g, '\\"')}"`;
}

function resolveSupabaseCommandEnv() {
  const commandEnv = { ...process.env };
  const hasPassword = typeof commandEnv.SUPABASE_DB_PASSWORD === "string" && commandEnv.SUPABASE_DB_PASSWORD.trim().length > 0;
  if (hasPassword) {
    return commandEnv;
  }

  const localSecretEnv = parseDotenvFile(LOCAL_REMOTE_DB_ENV_PATH);
  const localProjectRef = String(localSecretEnv.SUPABASE_PROJECT_REF ?? "").trim();
  if (localProjectRef && localProjectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(
      `Refusing to use ${LOCAL_REMOTE_DB_ENV_PATH} because SUPABASE_PROJECT_REF must be ${EXPECTED_PROJECT_REF}, got ${localProjectRef}.`,
    );
  }

  const localPassword = String(localSecretEnv.SUPABASE_DB_PASSWORD ?? "").trim();
  if (localPassword) {
    commandEnv.SUPABASE_DB_PASSWORD = localPassword;
  }

  return commandEnv;
}

export function runSupabaseCommand(args) {
  const commandEnv = resolveSupabaseCommandEnv();
  const result = process.platform === "win32"
    ? spawnSync(
      process.env.ComSpec || "cmd.exe",
      [
        "/d",
        "/s",
        "/c",
        ["npx", ...args].map((value) => quoteWindowsArg(value)).join(" "),
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: commandEnv,
        shell: false,
        windowsHide: true,
      },
    )
    : spawnSync(
      "npx",
      args,
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: commandEnv,
        shell: false,
      },
    );

  return {
    ...result,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    combined: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  const actualKeys = Object.keys(value).sort();
  const sortedExpectedKeys = [...expectedKeys].sort();
  if (
    actualKeys.length !== sortedExpectedKeys.length
    || actualKeys.some((key, index) => key !== sortedExpectedKeys[index])
  ) {
    throw new Error(`${label} must contain exactly: ${sortedExpectedKeys.join(", ")}.`);
  }
}

function parseJsonObject(output, label) {
  if (typeof output !== "string" || output.trim().length === 0) {
    throw new Error(`${label} must be one non-empty JSON object.`);
  }

  let value;
  try {
    value = JSON.parse(output);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function compareMigrationVersions(left, right) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function assertCanonicalMigrationVersions(rows) {
  const seen = new Set();
  let previous = null;

  for (const [index, row] of rows.entries()) {
    const version = row.local || row.remote;
    if (seen.has(version)) {
      throw new Error(`migration list JSON migrations contains duplicate version ${version}.`);
    }
    if (previous !== null && compareMigrationVersions(previous, version) >= 0) {
      throw new Error(`migration list JSON migrations must be in canonical version order at index ${index}.`);
    }
    seen.add(version);
    previous = version;
  }
}

function assertCanonicalStringArray(value, label, predicate = () => true) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  const seen = new Set();
  for (const [index, entry] of value.entries()) {
    assertNonEmptyString(entry, `${label}[${index}]`);
    if (!predicate(entry)) {
      throw new Error(`${label}[${index}] is not recognized.`);
    }
    if (seen.has(entry)) {
      throw new Error(`${label} must not contain duplicates.`);
    }
    seen.add(entry);
  }
  return [...value];
}

export function parseMigrationListJson(output) {
  const value = parseJsonObject(output, "migration list JSON");
  assertExactKeys(value, MIGRATION_LIST_KEYS, "migration list JSON");
  assertNonEmptyString(value.message, "migration list JSON message");
  if (!Array.isArray(value.migrations)) {
    throw new Error("migration list JSON migrations must be an array.");
  }

  const migrations = value.migrations.map((row, index) => {
    const label = `migration list JSON migrations[${index}]`;
    assertExactKeys(row, MIGRATION_LIST_ROW_KEYS, label);
    if (
      typeof row.local !== "string"
      || typeof row.remote !== "string"
      || typeof row.time !== "string"
    ) {
      throw new Error(`${label} local, remote, and time must be strings.`);
    }
    if (
      (row.local.length > 0 && !MIGRATION_VERSION.test(row.local))
      || (row.remote.length > 0 && !MIGRATION_VERSION.test(row.remote))
    ) {
      throw new Error(`${label} local and remote must be empty or numeric migration versions.`);
    }
    if (row.local.length === 0 && row.remote.length === 0) {
      throw new Error(`${label} must include a local or remote migration version.`);
    }
    if (row.local.length > 0 && row.remote.length > 0 && row.local !== row.remote) {
      throw new Error(`${label} cannot pair different local and remote versions.`);
    }
    assertNonEmptyString(row.time, `${label} time`);
    return {
      local: row.local,
      remote: row.remote,
      time: row.time,
    };
  });

  assertCanonicalMigrationVersions(migrations);
  return {
    message: value.message,
    migrations,
    mismatches: migrations
      .filter((row) => row.local !== row.remote)
      .map((row) => ({
        local: row.local || "<missing>",
        remote: row.remote || "<missing>",
      })),
  };
}

export function parseMigrationMismatches(output) {
  return parseMigrationListJson(output).mismatches;
}

export function parseDryRunJson(output) {
  const value = parseJsonObject(output, "db push dry-run JSON");
  assertExactKeys(value, DRY_RUN_KEYS, "db push dry-run JSON");
  assertNonEmptyString(value.message, "db push dry-run JSON message");
  if (typeof value.upToDate !== "boolean" || typeof value.dryRun !== "boolean") {
    throw new Error("db push dry-run JSON upToDate and dryRun must be booleans.");
  }
  if (!value.dryRun) {
    throw new Error("db push dry-run JSON must report dryRun=true.");
  }

  const migrations = assertCanonicalStringArray(
    value.migrations,
    "db push dry-run JSON migrations",
    (entry) => MIGRATION_FILENAME.test(entry) && path.basename(entry) === entry,
  );
  const seeds = assertCanonicalStringArray(value.seeds, "db push dry-run JSON seeds");
  const roles = assertCanonicalStringArray(value.roles, "db push dry-run JSON roles");
  const hasPendingWork = migrations.length > 0 || seeds.length > 0 || roles.length > 0;

  if (value.upToDate === hasPendingWork) {
    throw new Error(
      "db push dry-run JSON upToDate must be true exactly when migrations, seeds, and roles are empty.",
    );
  }
  for (let index = 1; index < migrations.length; index += 1) {
    const previousVersion = migrations[index - 1].split("_", 1)[0];
    const currentVersion = migrations[index].split("_", 1)[0];
    if (compareMigrationVersions(previousVersion, currentVersion) >= 0) {
      throw new Error("db push dry-run JSON migrations must be in canonical version order.");
    }
  }

  return {
    message: value.message,
    upToDate: value.upToDate,
    dryRun: value.dryRun,
    migrations,
    seeds,
    roles,
  };
}

export function parsePendingDryRun(output) {
  return parseDryRunJson(output).migrations;
}

function stableCommandFailure(status, message) {
  return {
    status: Number.isInteger(status) && status !== 0 ? status : 1,
    stdout: "",
    stderr: message,
    combined: message,
  };
}

export function getMigrationHistoryDrift({ runCommand = runSupabaseCommand } = {}) {
  let migrationList;
  try {
    migrationList = runCommand(MIGRATION_LIST_ARGS);
  } catch {
    return {
      ok: false,
      command: "npx supabase migration list --linked --output-format json",
      result: stableCommandFailure(1, "migration list command failed before returning JSON."),
      mismatches: [],
    };
  }

  if (migrationList.status !== 0) {
    return {
      ok: false,
      command: "npx supabase migration list --linked --output-format json",
      result: stableCommandFailure(migrationList.status, "migration list command failed."),
      mismatches: [],
    };
  }

  let parsed;
  try {
    parsed = parseMigrationListJson(migrationList.stdout);
  } catch (error) {
    return {
      ok: false,
      command: "npx supabase migration list --linked --output-format json",
      result: stableCommandFailure(
        1,
        error instanceof Error ? error.message : "migration list JSON validation failed.",
      ),
      mismatches: [],
    };
  }

  return {
    ok: true,
    command: "npx supabase migration list --linked --output-format json",
    result: migrationList,
    migrations: parsed.migrations,
    mismatches: parsed.mismatches,
  };
}

export function validateSupabaseChain({
  runCommand = runSupabaseCommand,
  logger = console,
} = {}) {
  const migrationHistory = getMigrationHistoryDrift({ runCommand });

  if (!migrationHistory.ok) {
    logger.error(migrationHistory.result.combined.trim());
    return migrationHistory.result.status ?? 1;
  }

  const mismatches = migrationHistory.mismatches;

  if (mismatches.length > 0) {
    logger.error("migration history drift detected:");
    for (const mismatch of mismatches) {
      logger.error(`- local ${mismatch.local} | remote ${mismatch.remote}`);
    }
    logger.error("repair or renumber the collisions before relying on dry-run output.");
    return 1;
  }

  let dryRun;
  try {
    dryRun = runCommand(DRY_RUN_ARGS);
  } catch {
    logger.error("db push dry-run command failed before returning JSON.");
    return 1;
  }

  if (dryRun.status !== 0) {
    if (dryRun.combined.includes("SUPABASE_DB_PASSWORD")) {
      logger.error("db push dry-run is blocked: set SUPABASE_DB_PASSWORD for the linked remote database.");
      return 1;
    }

    logger.error("db push dry-run command failed.");
    return Number.isInteger(dryRun.status) && dryRun.status !== 0 ? dryRun.status : 1;
  }

  let parsedDryRun;
  try {
    parsedDryRun = parseDryRunJson(dryRun.stdout);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : "db push dry-run JSON validation failed.");
    return 1;
  }

  if (!parsedDryRun.upToDate) {
    logger.error("db push dry-run still reports pending work:");
    for (const pendingMigration of parsedDryRun.migrations) {
      logger.error(`- ${pendingMigration}`);
    }
    for (const pendingSeed of parsedDryRun.seeds) {
      logger.error(`- seed ${pendingSeed}`);
    }
    for (const pendingRole of parsedDryRun.roles) {
      logger.error(`- role ${pendingRole}`);
    }
    return 1;
  }

  logger.log("supabase migration history is clean and db push --dry-run reports no pending migrations.");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(validateSupabaseChain());
}
