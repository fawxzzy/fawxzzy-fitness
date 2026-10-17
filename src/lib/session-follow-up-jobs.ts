import type { FitnessSupabaseClient } from "@/lib/supabase/schema";

export type SessionFollowUpJobKind = "exercise_stats" | "fitness_integrations";
export const SESSION_FOLLOW_UP_JOB_KINDS: SessionFollowUpJobKind[] = ["exercise_stats", "fitness_integrations"];

export type SessionFollowUpJobStatus = "pending" | "processing" | "completed" | "failed";

export type SessionFollowUpJobRow = {
  id: string;
  session_id?: string;
  user_id?: string;
  job_kind: SessionFollowUpJobKind;
  status: SessionFollowUpJobStatus;
  attempt_count: number;
  updated_at?: string | null;
};

type SessionFollowUpHandlerMap = Partial<Record<SessionFollowUpJobKind, () => Promise<void>>>;
type SessionFollowUpClient = FitnessSupabaseClient;

const SESSION_FOLLOW_UP_PROCESSING_LEASE_MS = 5 * 60 * 1000;
export const SESSION_FOLLOW_UP_MAX_ATTEMPTS = 5;

export type SessionFollowUpHandlerResult = {
  kind: SessionFollowUpJobKind;
  ok: boolean;
  error: string | null;
};

export type SessionFollowUpProcessableGroup = {
  sessionId: string;
  userId: string;
};

export function buildSessionFollowUpJobSeeds(args: {
  sessionId: string;
  userId: string;
  kinds?: SessionFollowUpJobKind[];
}) {
  return (args.kinds ?? SESSION_FOLLOW_UP_JOB_KINDS).map((kind) => ({
    session_id: args.sessionId,
    user_id: args.userId,
    job_kind: kind,
    status: "pending" as const,
  }));
}

export function selectProcessableSessionFollowUpGroups(args: {
  rows: SessionFollowUpJobRow[];
  staleBefore: Date;
  limit: number;
}): SessionFollowUpProcessableGroup[] {
  const groups = new Map<string, SessionFollowUpProcessableGroup>();
  const staleBeforeMs = args.staleBefore.getTime();

  for (const row of args.rows) {
    if (!row.session_id || !row.user_id || row.status === "completed") {
      continue;
    }

    if (row.status === "processing") {
      const updatedAtMs = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
      if (Number.isFinite(updatedAtMs) && updatedAtMs >= staleBeforeMs) {
        continue;
      }
    }

    const key = `${row.user_id}:${row.session_id}`;
    if (!groups.has(key)) {
      groups.set(key, { sessionId: row.session_id, userId: row.user_id });
    }

    if (groups.size >= args.limit) {
      break;
    }
  }

  return [...groups.values()];
}

export function selectExactPendingSessionFollowUpGroup(rows: SessionFollowUpJobRow[]) {
  if (rows.length !== SESSION_FOLLOW_UP_JOB_KINDS.length) {
    throw new Error("EXACT_FOLLOW_UP_GROUP_MISMATCH");
  }
  const [first] = rows;
  if (!first?.session_id || !first.user_id ||
      new Set(rows.map((row) => row.id)).size !== rows.length ||
      new Set(rows.map((row) => row.job_kind)).size !== rows.length ||
      rows.some((row) => row.session_id !== first.session_id ||
        row.user_id !== first.user_id || row.status !== "pending" ||
        !Number.isInteger(row.attempt_count) || row.attempt_count < 0 ||
        row.attempt_count >= SESSION_FOLLOW_UP_MAX_ATTEMPTS ||
        !SESSION_FOLLOW_UP_JOB_KINDS.includes(row.job_kind))) {
    throw new Error("EXACT_FOLLOW_UP_GROUP_MISMATCH");
  }
  return { sessionId: first.session_id, userId: first.user_id, rows };
}

export function buildSessionFollowUpExecutionPlan(
  claimedJobs: SessionFollowUpJobRow[],
) {
  const runnable: SessionFollowUpJobRow[] = [];
  const terminalResults: SessionFollowUpHandlerResult[] = [];

  for (const job of claimedJobs) {
    if (job.attempt_count > SESSION_FOLLOW_UP_MAX_ATTEMPTS) {
      terminalResults.push({
        kind: job.job_kind,
        ok: false,
        error: `Max follow-up attempts exceeded (${SESSION_FOLLOW_UP_MAX_ATTEMPTS}).`,
      });
      continue;
    }

    runnable.push(job);
  }

  return { runnable, terminalResults };
}

export async function settleSessionFollowUpHandlers(handlers: SessionFollowUpHandlerMap) {
  const entries = Object.entries(handlers) as Array<[SessionFollowUpJobKind, () => Promise<void>]>;
  const settled = await Promise.all(entries.map(async ([kind, handler]) => {
    try {
      await handler();
      return { kind, ok: true as const, error: null };
    } catch (error) {
      return {
        kind,
        ok: false as const,
        error: error instanceof Error ? error.message : "Unknown follow-up failure",
      };
    }
  }));

  return settled;
}

export async function enqueueSessionFollowUpJobs(args: {
  client: SessionFollowUpClient;
  sessionId: string;
  userId: string;
  kinds?: SessionFollowUpJobKind[];
}) {
  const { error } = await args.client
    .from("session_follow_up_jobs")
    .upsert(buildSessionFollowUpJobSeeds(args), {
      onConflict: "session_id,job_kind",
      ignoreDuplicates: true,
    });

  if (error) {
    throw error;
  }
}

export async function claimSessionFollowUpJobs(args: {
  client: SessionFollowUpClient;
  sessionId: string;
  userId: string;
  staleBefore: Date;
  claimTime: Date;
}) {
  const { data, error } = await args.client.rpc("claim_session_follow_up_jobs", {
    target_session_id: args.sessionId,
    target_user_id: args.userId,
    stale_before: args.staleBefore.toISOString(),
    claim_time: args.claimTime.toISOString(),
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as SessionFollowUpJobRow[];
}

async function buildSessionFollowUpHandlers(args: {
  client: SessionFollowUpClient;
  sessionId: string;
  userId: string;
  durationSeconds: number | null;
  affectedExerciseIds: string[];
  now: Date;
}) {
  const {
    publishFitnessIntegrationStateForMember,
    recordFitnessSignalForMember,
  } = await import("@/lib/ecosystem/fitness-integration-server");
  const { recomputeExerciseStatsForExercises } = await import("@/lib/exercise-stats");
  const { isFeatureEnabled } = await import("@/lib/feature-flags");

  return {
    exercise_stats: async () => {
      await recomputeExerciseStatsForExercises(args.userId, args.affectedExerciseIds, args.client as never, { strict: true });
    },
    fitness_integrations: async () => {
      if (isFeatureEnabled("shareableRecapArtifacts")) {
        const { buildWorkoutRecapArtifactForSession } = await import("@/lib/workout-recap");
        await buildWorkoutRecapArtifactForSession({
          client: args.client,
          sessionId: args.sessionId,
          userId: args.userId,
        });
      }

      await recordFitnessSignalForMember({
        memberId: args.userId,
        signalType: "workout_completed",
        reason: "session_completed",
        emittedAt: args.now,
        payload: {
          memberId: args.userId,
          sessionId: args.sessionId,
          completedAt: args.now.toISOString(),
          durationMinutes: Math.max(0, Math.round((args.durationSeconds ?? 0) / 60)),
          completionRate: 1,
        },
      });

      await publishFitnessIntegrationStateForMember({
        memberId: args.userId,
        reason: "session_completed",
        now: args.now,
        client: args.client,
      });
    },
  } satisfies Record<SessionFollowUpJobKind, () => Promise<void>>;
}

export async function settleClaimedSessionFollowUpJobs(args: {
  client: SessionFollowUpClient;
  claimedJobs: SessionFollowUpJobRow[];
  sessionId: string;
  userId: string;
  durationSeconds: number | null;
  affectedExerciseIds: string[];
  now: Date;
  handlersByKind?: SessionFollowUpHandlerMap;
}) {
  if (args.claimedJobs.length === 0) {
    return { ok: true as const, hadFailures: false, results: [] as SessionFollowUpHandlerResult[] };
  }

  const executionPlan = buildSessionFollowUpExecutionPlan(args.claimedJobs);
  const handlersByKind = args.handlersByKind ?? await buildSessionFollowUpHandlers(args);
  const results = await settleSessionFollowUpHandlers(Object.fromEntries(
    executionPlan.runnable.map((job) => [job.job_kind, handlersByKind[job.job_kind]]),
  ) as SessionFollowUpHandlerMap);
  const allResults = [...executionPlan.terminalResults, ...results];
  const settlementFailures: SessionFollowUpHandlerResult[] = [];

  for (const result of allResults) {
    const matchingJob = args.claimedJobs.find((job) => job.job_kind === result.kind);
    if (!matchingJob) {
      continue;
    }

    const { data: settled, error: settlementError } = await args.client
      .from("session_follow_up_jobs")
      .update({
        status: result.ok ? "completed" : "failed",
        last_error: result.error,
        completed_at: result.ok ? args.now.toISOString() : null,
        updated_at: args.now.toISOString(),
      })
      .eq("id", matchingJob.id)
      .eq("user_id", args.userId)
      .select("id")
      .maybeSingle();
    if (settlementError || !settled) {
      settlementFailures.push({ kind: result.kind, ok: false, error: "FOLLOW_UP_SETTLEMENT_FAILED" });
    }
  }

  return {
    ok: true as const,
    hadFailures: allResults.some((result) => !result.ok) || settlementFailures.length > 0,
    results: [...allResults, ...settlementFailures],
  };
}

export async function processSessionFollowUpJobs(args: {
  sessionId: string;
  userId: string;
  durationSeconds: number | null;
  affectedExerciseIds: string[];
  now?: Date;
}) {
  const { supabaseServer } = await import("@/lib/supabase/server");
  const supabase = supabaseServer();
  const now = args.now ?? new Date();

  await enqueueSessionFollowUpJobs({ client: supabase, sessionId: args.sessionId, userId: args.userId });
  const staleBefore = new Date(now.getTime() - SESSION_FOLLOW_UP_PROCESSING_LEASE_MS).toISOString();
  const claimedJobs = await claimSessionFollowUpJobs({
    client: supabase,
    sessionId: args.sessionId,
    userId: args.userId,
    staleBefore: new Date(staleBefore),
    claimTime: now,
  });

  return settleClaimedSessionFollowUpJobs({
    client: supabase,
    claimedJobs,
    sessionId: args.sessionId,
    userId: args.userId,
    durationSeconds: args.durationSeconds,
    affectedExerciseIds: args.affectedExerciseIds,
    now,
  });
}

export async function processExactPendingSessionFollowUpGroup(args: {
  client: SessionFollowUpClient;
  createdAt: string;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(args.createdAt)) {
    throw new Error("EXACT_FOLLOW_UP_TIMESTAMP_INVALID");
  }
  const columns = "id, session_id, user_id, job_kind, status, attempt_count, updated_at";
  const { data: timestampRows, error: timestampError } = await args.client
    .from("session_follow_up_jobs")
    .select(columns)
    .eq("created_at", args.createdAt);
  if (timestampError) throw new Error("EXACT_FOLLOW_UP_TIMESTAMP_READ_FAILED");
  const target = selectExactPendingSessionFollowUpGroup((timestampRows ?? []) as SessionFollowUpJobRow[]);

  const { data: groupRows, error: groupError } = await args.client
    .from("session_follow_up_jobs")
    .select(columns)
    .eq("session_id", target.sessionId);
  if (groupError) throw new Error("EXACT_FOLLOW_UP_GROUP_READ_FAILED");
  const group = selectExactPendingSessionFollowUpGroup((groupRows ?? []) as SessionFollowUpJobRow[]);
  if (group.userId !== target.userId ||
      group.rows.some((row) => !target.rows.some((expected) => expected.id === row.id && expected.job_kind === row.job_kind))) {
    throw new Error("EXACT_FOLLOW_UP_GROUP_CHANGED");
  }

  const { data: session, error: sessionError } = await args.client
    .from("sessions")
    .select("duration_seconds, status")
    .eq("id", target.sessionId)
    .eq("user_id", target.userId)
    .maybeSingle();
  if (sessionError || !session || session.status !== "completed") {
    throw new Error("EXACT_FOLLOW_UP_SESSION_INVALID");
  }
  const { data: sessionExercises, error: exercisesError } = await args.client
    .from("session_exercises")
    .select("exercise_id")
    .eq("session_id", target.sessionId)
    .eq("user_id", target.userId);
  if (exercisesError) throw new Error("EXACT_FOLLOW_UP_EXERCISES_READ_FAILED");
  const affectedExerciseIds = Array.from(new Set(
    ((sessionExercises ?? []) as Array<{ exercise_id: string | null }>).map((row) => row.exercise_id).filter(Boolean) as string[],
  ));
  if (affectedExerciseIds.length === 0) throw new Error("EXACT_FOLLOW_UP_EXERCISES_EMPTY");

  const claimedJobs = await claimSessionFollowUpJobs({
    client: args.client,
    sessionId: target.sessionId,
    userId: target.userId,
    staleBefore: new Date(now.getTime() - SESSION_FOLLOW_UP_PROCESSING_LEASE_MS),
    claimTime: now,
  });
  if (claimedJobs.length !== target.rows.length ||
      claimedJobs.some((job) => !target.rows.some((expected) =>
        expected.id === job.id && expected.job_kind === job.job_kind &&
        job.status === "processing" && job.attempt_count === expected.attempt_count + 1))) {
    throw new Error("EXACT_FOLLOW_UP_CLAIM_CHANGED");
  }
  const settlement = await settleClaimedSessionFollowUpJobs({
    client: args.client,
    claimedJobs,
    sessionId: target.sessionId,
    userId: target.userId,
    durationSeconds: session.duration_seconds,
    affectedExerciseIds,
    now,
  });
  return {
    ok: !settlement.hadFailures,
    claimedJobCount: claimedJobs.length,
    hadFailures: settlement.hadFailures,
    results: settlement.results.map((result) => ({ kind: result.kind, ok: result.ok })),
  };
}

export async function processSessionFollowUpJobBatch(args: {
  client: SessionFollowUpClient;
  limit?: number;
  now?: Date;
}) {
  const now = args.now ?? new Date();
  const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
  const staleBefore = new Date(now.getTime() - SESSION_FOLLOW_UP_PROCESSING_LEASE_MS);
  const { data: rows, error } = await args.client
    .from("session_follow_up_jobs")
    .select("id, session_id, user_id, job_kind, status, attempt_count, updated_at")
    .in("status", ["pending", "failed", "processing"])
    .order("updated_at", { ascending: true })
    .limit(limit * 4);

  if (error) {
    throw error;
  }

  const groups = selectProcessableSessionFollowUpGroups({
    rows: (rows ?? []) as SessionFollowUpJobRow[],
    staleBefore,
    limit,
  });
  const processed = [];

  for (const group of groups) {
    const { data: session, error: sessionError } = await args.client
      .from("sessions")
      .select("duration_seconds")
      .eq("id", group.sessionId)
      .eq("user_id", group.userId)
      .maybeSingle();
    if (sessionError) {
      throw sessionError;
    }

    const { data: sessionExercises, error: sessionExercisesError } = await args.client
      .from("session_exercises")
      .select("exercise_id")
      .eq("session_id", group.sessionId)
      .eq("user_id", group.userId);
    if (sessionExercisesError) {
      throw sessionExercisesError;
    }

    const affectedExerciseIds = Array.from(new Set(
      ((sessionExercises ?? []) as Array<{ exercise_id: string | null }>).map((row) => row.exercise_id).filter(Boolean) as string[],
    ));
    const claimedJobs = await claimSessionFollowUpJobs({
      client: args.client,
      sessionId: group.sessionId,
      userId: group.userId,
      staleBefore,
      claimTime: now,
    });
    const result = await settleClaimedSessionFollowUpJobs({
      client: args.client,
      claimedJobs,
      sessionId: group.sessionId,
      userId: group.userId,
      durationSeconds: typeof session?.duration_seconds === "number" ? session.duration_seconds : null,
      affectedExerciseIds,
      now,
    });

    processed.push({
      ...group,
      claimedJobCount: claimedJobs.length,
      hadFailures: result.hadFailures,
      results: result.results,
    });
  }

  return {
    ok: true as const,
    processedCount: processed.length,
    hadFailures: processed.some((entry) => entry.hadFailures),
    processed,
  };
}
