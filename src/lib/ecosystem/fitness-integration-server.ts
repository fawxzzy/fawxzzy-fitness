import { supabaseServer } from "@/lib/supabase/server";
import {
  buildFitnessSnapshotSourceState,
  fitnessIntegrationClient,
  type FitnessOutboundReason,
  type FitnessSnapshotSourceState,
} from "./fitness-integration-client";

function dateFromIso(iso: string): string {
  return iso.slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export async function buildFitnessSnapshotSourceStateFromApp(memberId: string, now: Date | string): Promise<FitnessSnapshotSourceState> {
  const supabase = supabaseServer();

  return buildFitnessSnapshotSourceState({
    memberId,
    now,
    fetcher: {
      async getRoutineDayPlanCountForCurrentWeek(userId, _weekStartDate) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("active_routine_id")
          .eq("id", userId)
          .maybeSingle();

        if (!profile?.active_routine_id) return 0;

        const { count } = await supabase
          .from("routine_days")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("routine_id", profile.active_routine_id)
          .eq("is_rest", false);

        return count ?? 0;
      },

      async getCompletedWorkoutCountForCurrentWeek(userId, weekStartDate) {
        const weekEndDate = shiftDate(weekStartDate, 7);
        const { count } = await supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("performed_at", `${weekStartDate}T00:00:00.000Z`)
          .lt("performed_at", `${weekEndDate}T00:00:00.000Z`);

        return count ?? 0;
      },

      async getCompletedSessions(userId, days, nowIso) {
        const startDate = shiftDate(dateFromIso(nowIso), -days);

        const { data } = await supabase
          .from("sessions")
          .select("performed_at, duration_seconds")
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("performed_at", `${startDate}T00:00:00.000Z`)
          .lte("performed_at", nowIso)
          .order("performed_at", { ascending: false });

        return (data ?? []).map((entry) => ({
          performedAt: entry.performed_at,
          durationSeconds: entry.duration_seconds,
        }));
      },

      async getConsecutiveMisses(userId, nowIso) {
        const { data } = await supabase
          .from("sessions")
          .select("performed_at, status")
          .eq("user_id", userId)
          .order("performed_at", { ascending: false })
          .limit(14);

        const rows = data ?? [];
        let misses = 0;
        let lastMissedSessionDate: string | null = null;

        for (const row of rows) {
          if (row.status === "completed") {
            break;
          }

          misses += 1;
          if (!lastMissedSessionDate) {
            lastMissedSessionDate = dateFromIso(row.performed_at);
          }
        }

        if (misses === 0) {
          const nowDay = dateFromIso(nowIso);
          const hasCompletionToday = rows.some((row) => row.status === "completed" && dateFromIso(row.performed_at) === nowDay);
          if (!hasCompletionToday) {
            return {
              consecutiveMisses: 1,
              lastMissedSessionDate: nowDay,
            };
          }
        }

        return {
          consecutiveMisses: misses,
          lastMissedSessionDate,
        };
      },

      async getInProgressSessionSummary(userId) {
        const { data: session } = await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "in_progress")
          .order("performed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!session?.id) {
          return {
            inProgressSessionId: null,
            inProgressExerciseCount: 0,
          };
        }

        const { count } = await supabase
          .from("session_exercises")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("session_id", session.id);

        return {
          inProgressSessionId: session.id,
          inProgressExerciseCount: count ?? 0,
        };
      },
    },
  });
}

export async function publishFitnessIntegrationStateForMember(input: {
  memberId: string;
  reason: FitnessOutboundReason;
  now?: Date | string;
}) {
  const now = input.now ?? new Date();
  const sourceState = await buildFitnessSnapshotSourceStateFromApp(input.memberId, now);

  const outboundSignals = fitnessIntegrationClient.evaluateAndPackageSignals({
    source: sourceState,
    reason: input.reason,
  });

  const snapshotExport = fitnessIntegrationClient.packageSnapshots({
    memberId: input.memberId,
    source: sourceState,
    reason: input.reason,
  });

  return {
    sourceState,
    outboundSignals,
    snapshotExport,
  };
}
