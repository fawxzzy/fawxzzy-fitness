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
type SessionFollowUpClient = {
  from: (table: string) => any;
  rpc: (functionName: string, args: Record<string, unknown>) => any;
};

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
      await recomputeExerciseStatsForExercises(args.userId, args.affectedExerciseIds, args.client as never);
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
      });
    },
  } satisfies Record<SessionFollowUpJobKind, () => Promise<void>>;
}

async function settleClaimedSessionFollowUpJobs(args: {
  client: SessionFollowUpClient;
  claimedJobs: SessionFollowUpJobRow[];
  sessionId: string;
  userId: string;
  durationSeconds: number | null;
  affectedExerciseIds: string[];
  now: Date;
}) {
  if (args.claimedJobs.length === 0) {
    return { ok: true as const, hadFailures: false, results: [] as SessionFollowUpHandlerResult[] };
  }

  const executionPlan = buildSessionFollowUpExecutionPlan(args.claimedJobs);
  const handlersByKind = await buildSessionFollowUpHandlers(args);
  const results = await settleSessionFollowUpHandlers(Object.fromEntries(
    executionPlan.runnable.map((job) => [job.job_kind, handlersByKind[job.job_kind]]),
  ) as SessionFollowUpHandlerMap);
  const allResults = [...executionPlan.terminalResults, ...results];

  for (const result of allResults) {
    const matchingJob = args.claimedJobs.find((job) => job.job_kind === result.kind);
    if (!matchingJob) {
      continue;
    }

    await args.client
      .from("session_follow_up_jobs")
      .update({
        status: result.ok ? "completed" : "failed",
        last_error: result.error,
        completed_at: result.ok ? args.now.toISOString() : null,
        updated_at: args.now.toISOString(),
      })
      .eq("id", matchingJob.id)
      .eq("user_id", args.userId);
  }

  return {
    ok: true as const,
    hadFailures: allResults.some((result) => !result.ok),
    results: allResults,
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
