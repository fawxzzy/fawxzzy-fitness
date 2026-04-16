import { spawnSync } from "node:child_process";
const MIGRATION_ROW = /^\s*(\d+)?\s*\|\s*(\d+)?\s*\|/;

function runSupabaseCommand(args) {
  const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : "npx",
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npx", ...args]
      : args,
    {
      cwd: process.cwd(),
      encoding: "utf8",
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

function parseMigrationMismatches(output) {
  const mismatches = [];

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(MIGRATION_ROW);
    if (!match) {
      continue;
    }

    const local = match[1] ?? "";
    const remote = match[2] ?? "";

    if (local !== remote) {
      mismatches.push({
        local: local || "<missing>",
        remote: remote || "<missing>",
      });
    }
  }

  return mismatches;
}

function parsePendingDryRun(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /\.sql$/.test(line))
    .map((line) => line.replace(/^[^A-Za-z0-9]+/, "").trim());
}

const migrationList = runSupabaseCommand(["supabase", "migration", "list", "--linked"]);

if (migrationList.status !== 0) {
  console.error(migrationList.combined.trim());
  process.exit(migrationList.status ?? 1);
}

const mismatches = parseMigrationMismatches(migrationList.stdout);

if (mismatches.length > 0) {
  console.error("migration history drift detected:");
  for (const mismatch of mismatches) {
    console.error(`- local ${mismatch.local} | remote ${mismatch.remote}`);
  }
  console.error("repair or renumber the collisions before relying on dry-run output.");
  process.exit(1);
}

const dryRun = runSupabaseCommand(["supabase", "db", "push", "--dry-run", "--linked"]);

if (dryRun.status !== 0) {
  if (dryRun.combined.includes("SUPABASE_DB_PASSWORD")) {
    console.error("db push dry-run is blocked: set SUPABASE_DB_PASSWORD for the linked remote database.");
    process.exit(1);
  }

  console.error(dryRun.combined.trim());
  process.exit(dryRun.status ?? 1);
}

const pendingMigrations = parsePendingDryRun(dryRun.combined);

if (pendingMigrations.length > 0) {
  console.error("db push dry-run still reports pending migrations:");
  for (const pendingMigration of pendingMigrations) {
    console.error(`- ${pendingMigration}`);
  }
  process.exit(1);
}

console.log("supabase migration history is clean and db push --dry-run reports no pending migrations.");
