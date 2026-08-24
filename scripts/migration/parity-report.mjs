import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PARITY_METRICS = [
  { id: "profiles", label: "profiles", table: "profiles", column: "id" },
  { id: "user_owned_exercises", label: "user-owned exercises", table: "exercises", column: "user_id" },
  { id: "routines", label: "routines", table: "routines", column: "user_id" },
  { id: "routine_days", label: "routine_days", table: "routine_days", column: "user_id" },
  { id: "routine_day_exercises", label: "routine_day_exercises", table: "routine_day_exercises", column: "user_id" },
  { id: "sessions", label: "sessions", table: "sessions", column: "user_id" },
  { id: "session_exercises", label: "session_exercises", table: "session_exercises", column: "user_id" },
  { id: "sets", label: "sets", table: "sets", column: "user_id" },
];

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
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

function readSnapshot(snapshotPath) {
  const absolutePath = resolve(process.cwd(), snapshotPath);
  const raw = readFileSync(absolutePath, "utf8");
  const snapshot = JSON.parse(raw);

  if (snapshot?.metadata?.snapshot_version !== "fitness-legacy-v1") {
    throw new Error(`Snapshot at ${absolutePath} is not a fitness-legacy-v1 payload.`);
  }

  return snapshot;
}

function getSnapshotCounts(snapshot) {
  if (!snapshot) {
    return null;
  }

  return {
    profiles: snapshot.profile ? 1 : 0,
    user_owned_exercises: snapshot.exercises.filter((exercise) => exercise.owner_scope === "user").length,
    routines: snapshot.routines.length,
    routine_days: snapshot.routine_days.length,
    routine_day_exercises: snapshot.routine_day_exercises.length,
    sessions: snapshot.sessions.length,
    session_exercises: snapshot.session_exercises.length,
    sets: snapshot.sets.length,
  };
}

async function getRemoteCounts(userId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the parity report.");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: {
      schema: "fitness",
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const counts = await Promise.all(
    PARITY_METRICS.map(async (metric) => {
      const { count, error } = await supabase
        .from(metric.table)
        .select("id", { count: "exact", head: true })
        .eq(metric.column, userId);

      if (error) {
        throw new Error(`${metric.table}: ${error.message}`);
      }

      return [metric.id, count ?? 0];
    }),
  );

  return Object.fromEntries(counts);
}

const args = parseArgs(process.argv.slice(2));
const userId = args["user-id"];
const snapshotPath = args.snapshot;

if (!userId) {
  console.error("Usage: npm run migration:parity -- --user-id <new-project-user-id> [--snapshot <snapshot.json>]");
  process.exit(1);
}

const snapshot = snapshotPath ? readSnapshot(snapshotPath) : null;
const snapshotCounts = getSnapshotCounts(snapshot);
const remoteCounts = await getRemoteCounts(userId);

console.log(`migration parity report for ${userId}`);
if (snapshotPath) {
  console.log(`snapshot: ${resolve(process.cwd(), snapshotPath)}`);
}
console.log("excluded from hard signoff: exercise_stats, session_follow_up_jobs");
console.log("global exercises: compare by normalized_name if you audit them separately");

let hasMismatch = false;

for (const metric of PARITY_METRICS) {
  const remoteCount = remoteCounts[metric.id];
  const snapshotCount = snapshotCounts ? snapshotCounts[metric.id] : null;
  const matches = snapshotCount === null ? null : snapshotCount === remoteCount;

  if (matches === false) {
    hasMismatch = true;
  }

  const status = matches === null ? "remote-only" : matches ? "match" : "mismatch";
  const snapshotText = snapshotCount === null ? "n/a" : String(snapshotCount);
  console.log(`${metric.label}: snapshot=${snapshotText} remote=${remoteCount} status=${status}`);
}

process.exit(hasMismatch ? 1 : 0);
