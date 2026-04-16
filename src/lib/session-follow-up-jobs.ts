export type SessionFollowUpJobKind = "exercise_stats" | "fitness_integrations";

type SessionFollowUpJobRow = {
  id: string;
  job_kind: SessionFollowUpJobKind;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: number;
};

type SessionFollowUpHandlerMap = Partial<Record<SessionFollowUpJobKind, () => Promise<void>>>;

const SESSION_FOLLOW_UP_PROCESSING_LEASE_MS = 5 * 60 * 1000;

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

export async function processSessionFollowUpJobs(args: {
  sessionId: string;
  userId: string;
  durationSeconds: number | null;
  affectedExerciseIds: string[];
  now?: Date;
}) {
  const { fitnessIntegrationClient } = await import("@/lib/ecosystem/fitness-integration-client");
  const { publishFitnessIntegrationStateForMember } = await import("@/lib/ecosystem/fitness-integration-server");
  const { recomputeExerciseStatsForExercises } = await import("@/lib/exercise-stats");
  const { supabaseServer } = await import("@/lib/supabase/server");
  const supabase = supabaseServer();
  const now = args.now ?? new Date();

  const { error: upsertError } = await supabase
    .from("session_follow_up_jobs")
    .upsert([
      { session_id: args.sessionId, user_id: args.userId, job_kind: "exercise_stats", status: "pending" },
      { session_id: args.sessionId, user_id: args.userId, job_kind: "fitness_integrations", status: "pending" },
    ], {
      onConflict: "session_id,job_kind",
      ignoreDuplicates: true,
    });

  if (upsertError) {
    throw upsertError;
  }

  const staleBefore = new Date(now.getTime() - SESSION_FOLLOW_UP_PROCESSING_LEASE_MS).toISOString();
  const { data: claimedJobsData, error: claimedJobsError } = await supabase.rpc("claim_session_follow_up_jobs", {
    target_session_id: args.sessionId,
    target_user_id: args.userId,
    stale_before: staleBefore,
    claim_time: now.toISOString(),
  });

  if (claimedJobsError) {
    throw claimedJobsError;
  }

  const claimedJobs = (claimedJobsData ?? []) as SessionFollowUpJobRow[];
  if (claimedJobs.length === 0) {
    return { ok: true as const, hadFailures: false, results: [] as Array<{ kind: SessionFollowUpJobKind; ok: boolean; error: string | null }> };
  }

  const handlersByKind: Record<SessionFollowUpJobKind, () => Promise<void>> = {
    exercise_stats: async () => {
      await recomputeExerciseStatsForExercises(args.userId, args.affectedExerciseIds);
    },
    fitness_integrations: async () => {
      fitnessIntegrationClient.packageSignal({
        memberId: args.userId,
        signalType: "workout_completed",
        reason: "session_completed",
        emittedAt: now,
        payload: {
          memberId: args.userId,
          sessionId: args.sessionId,
          completedAt: now.toISOString(),
          durationMinutes: Math.max(0, Math.round((args.durationSeconds ?? 0) / 60)),
          completionRate: 1,
        },
      });

      await publishFitnessIntegrationStateForMember({
        memberId: args.userId,
        reason: "session_completed",
        now,
      });
    },
  };

  const results = await settleSessionFollowUpHandlers(Object.fromEntries(
    claimedJobs.map((job) => [job.job_kind, handlersByKind[job.job_kind]]),
  ) as SessionFollowUpHandlerMap);

  for (const result of results) {
    const matchingJob = claimedJobs.find((job) => job.job_kind === result.kind);
    if (!matchingJob) {
      continue;
    }

    await supabase
      .from("session_follow_up_jobs")
      .update({
        status: result.ok ? "completed" : "failed",
        last_error: result.error,
        completed_at: result.ok ? now.toISOString() : null,
        updated_at: now.toISOString(),
      })
      .eq("id", matchingJob.id)
      .eq("user_id", args.userId);
  }

  return {
    ok: true as const,
    hadFailures: results.some((result) => !result.ok),
    results,
  };
}
