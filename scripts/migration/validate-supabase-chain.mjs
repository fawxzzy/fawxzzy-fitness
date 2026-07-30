import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDotenvFile } from "../env-file.mjs";

const MIGRATION_VERSION = /^\d+$/u;
const MIGRATION_FILENAME = /^\d+_[A-Za-z0-9][A-Za-z0-9._-]*\.sql$/u;
const REPOSITORY_SQL_PATH = /^(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.sql$/u;
const CREDENTIAL_SIGNATURES = [
  /sb_(?:secret|publishable)_[A-Za-z0-9_-]{8,}/iu,
  /(?:AKIA|ASIA|AIDA|AROA|AIPA|ANPA|ANVA|ASCA)[A-Z0-9]{16}/u,
  /github_pat_[A-Za-z0-9_]{20,}/iu,
  /gh[pousr]_[A-Za-z0-9]{20,}/iu,
  /(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}/iu,
  /xox[baprs]-[A-Za-z0-9-]{10,}/iu,
  /AIza[0-9A-Za-z_-]{20,}/u,
  /eyJ[A-Za-z0-9_-]{8,}/u,
];
const WINDOWS_RESERVED_PATH_COMPONENT = /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu;
const MAX_REPOSITORY_PATH_LENGTH = 512;
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

function assertNoDuplicateJsonObjectKeys(output, label) {
  let index = 0;

  const fail = () => {
    throw new Error(`${label} must be valid JSON.`);
  };
  const skipWhitespace = () => {
    while (index < output.length && /\s/u.test(output[index])) {
      index += 1;
    }
  };
  const parseString = () => {
    if (output[index] !== '"') {
      fail();
    }
    const start = index;
    index += 1;
    while (index < output.length) {
      const character = output[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(output.slice(start, index));
        } catch {
          fail();
        }
      }
      if (character.charCodeAt(0) < 0x20) {
        fail();
      }
      if (character === "\\") {
        index += 1;
        if (index >= output.length) {
          fail();
        }
        if (output[index] === "u") {
          index += 4;
          if (index >= output.length) {
            fail();
          }
        }
      }
      index += 1;
    }
    fail();
  };
  const parseLiteral = (literal) => {
    if (!output.startsWith(literal, index)) {
      fail();
    }
    index += literal.length;
  };
  const parseNumber = () => {
    const match = output.slice(index).match(
      /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u,
    );
    if (!match) {
      fail();
    }
    index += match[0].length;
  };
  const expect = (character) => {
    if (output[index] !== character) {
      fail();
    }
    index += 1;
  };

  let parseValue;
  const parseArray = () => {
    expect("[");
    skipWhitespace();
    if (output[index] === "]") {
      index += 1;
      return;
    }
    while (index < output.length) {
      parseValue();
      skipWhitespace();
      if (output[index] === "]") {
        index += 1;
        return;
      }
      expect(",");
      skipWhitespace();
    }
    fail();
  };
  const parseObject = () => {
    expect("{");
    skipWhitespace();
    if (output[index] === "}") {
      index += 1;
      return;
    }

    const keys = new Set();
    while (index < output.length) {
      const key = parseString();
      if (keys.has(key)) {
        throw new Error(`${label} must not contain duplicate object keys.`);
      }
      keys.add(key);
      skipWhitespace();
      expect(":");
      skipWhitespace();
      parseValue();
      skipWhitespace();
      if (output[index] === "}") {
        index += 1;
        return;
      }
      expect(",");
      skipWhitespace();
    }
    fail();
  };
  parseValue = () => {
    skipWhitespace();
    switch (output[index]) {
      case "{":
        parseObject();
        return;
      case "[":
        parseArray();
        return;
      case '"':
        parseString();
        return;
      case "t":
        parseLiteral("true");
        return;
      case "f":
        parseLiteral("false");
        return;
      case "n":
        parseLiteral("null");
        return;
      default:
        parseNumber();
    }
  };

  skipWhitespace();
  parseValue();
  skipWhitespace();
  if (index !== output.length) {
    fail();
  }
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

  assertNoDuplicateJsonObjectKeys(output, label);

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

function isCanonicalRepositorySqlPath(value) {
  const components = value.split("/");
  return (
    value.length <= MAX_REPOSITORY_PATH_LENGTH
    && REPOSITORY_SQL_PATH.test(value)
    && !path.posix.isAbsolute(value)
    && !path.win32.isAbsolute(value)
    && path.posix.normalize(value) === value
    && components.every(
      (component) => (
        !component.endsWith(".")
        && !component.endsWith(" ")
        && !WINDOWS_RESERVED_PATH_COMPONENT.test(component)
        && !CREDENTIAL_SIGNATURES.some((signature) => signature.test(component))
      ),
    )
  );
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
  const seeds = assertCanonicalStringArray(
    value.seeds,
    "db push dry-run JSON seeds",
    isCanonicalRepositorySqlPath,
  );
  const roles = assertCanonicalStringArray(
    value.roles,
    "db push dry-run JSON roles",
    isCanonicalRepositorySqlPath,
  );
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
    if (parsedDryRun.seeds.length > 0) {
      logger.error(`- pending seed files: ${parsedDryRun.seeds.length}`);
    }
    if (parsedDryRun.roles.length > 0) {
      logger.error(`- pending role files: ${parsedDryRun.roles.length}`);
    }
    return 1;
  }

  logger.log("supabase migration history is clean and db push --dry-run reports no pending migrations.");
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(validateSupabaseChain());
}
