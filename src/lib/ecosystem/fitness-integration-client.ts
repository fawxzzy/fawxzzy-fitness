import { fitnessIntegrationContract, type FitnessReceiptType, type FitnessSignalType, type FitnessStateSnapshotType } from "./fitness-integration-contract";
import type { DeterministicSignalFixture, DeterministicStateSnapshotFixture, EcosystemRoutingMetadata } from "./contract-types";

export type FitnessSignalPayload = Readonly<Record<string, string | number | boolean>>;
export type FitnessSnapshotPayload = Readonly<Record<string, string | number | boolean>>;

export type FitnessOutboundReason =
  | "session_completed"
  | "session_discarded"
  | "streak_evaluation"
  | "recovery_evaluation"
  | "manual_debug";

export interface FitnessOutboundSignal extends DeterministicSignalFixture<FitnessSignalType> {
  readonly outboundId: string;
  readonly reason: FitnessOutboundReason;
}

export interface FitnessOutboundSnapshot extends DeterministicStateSnapshotFixture<FitnessStateSnapshotType> {
  readonly outboundId: string;
  readonly reason: FitnessOutboundReason;
}

export interface FitnessInboundReceipt {
  readonly receiptType: FitnessReceiptType;
  readonly receiptId: string;
  readonly actionType: string;
  readonly memberId: string;
  readonly appliedAt: string;
  readonly sourceOutboundId: string;
  readonly payload: Readonly<Record<string, string | number | boolean>>;
}

export interface FitnessSnapshotSourceState {
  readonly memberId: string;
  readonly capturedAt: string;
  readonly weekStartDate: string;
  readonly plannedWorkoutCount: number;
  readonly completedWorkoutCount: number;
  readonly activeStreakDays: number;
  readonly lastCompletedDate: string | null;
  readonly consecutiveMisses: number;
  readonly lastMissedSessionDate: string | null;
  readonly completedMinutesLast7Days: number;
  readonly completedMinutesPrevious7Days: number;
  readonly inProgressSessionId: string | null;
  readonly inProgressExerciseCount: number;
}

export interface FitnessIntegrationDebugState {
  readonly emittedSignals: readonly FitnessOutboundSignal[];
  readonly exportedSnapshots: readonly FitnessOutboundSnapshot[];
  readonly receipts: readonly FitnessInboundReceipt[];
}

const DEBUG_RING_LIMIT = 150;
const debugStateByMember = new Map<string, { signals: FitnessOutboundSignal[]; snapshots: FitnessOutboundSnapshot[]; receipts: FitnessInboundReceipt[] }>();

function isoNow(now: Date | string): string {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 100) / 100;
}

function getSignalRouting(signalType: FitnessSignalType): EcosystemRoutingMetadata {
  const signal = fitnessIntegrationContract.signals.find((entry) => entry.type === signalType);
  if (!signal) {
    throw new Error(`Unknown signal type ${signalType}`);
  }

  return signal.routing;
}

function pushBounded<T>(target: T[], value: T): void {
  target.unshift(value);
  if (target.length > DEBUG_RING_LIMIT) {
    target.length = DEBUG_RING_LIMIT;
  }
}

function getOrCreateMemberDebugState(memberId: string) {
  const existing = debugStateByMember.get(memberId);
  if (existing) return existing;

  const created = { signals: [], snapshots: [], receipts: [] };
  debugStateByMember.set(memberId, created);
  return created;
}

let outboundCounter = 0;
function createOutboundId(prefix: string): string {
  outboundCounter += 1;
  return `${prefix}-${String(outboundCounter).padStart(6, "0")}`;
}

export function buildFitnessSnapshots(source: FitnessSnapshotSourceState): {
  athleteReadiness: FitnessSnapshotPayload;
  weeklyProgress: FitnessSnapshotPayload;
  streakHealth: FitnessSnapshotPayload;
} {
  const capturedAt = isoNow(source.capturedAt);

  const planned = Math.max(0, source.plannedWorkoutCount);
  const completed = Math.max(0, source.completedWorkoutCount);

  const completed7 = Math.max(0, source.completedMinutesLast7Days);
  const previous7 = Math.max(0, source.completedMinutesPrevious7Days);
  const loadTrend = previous7 > 0 ? (completed7 - previous7) / previous7 : completed7 > 0 ? 1 : 0;

  const fatigueScore = clampPercent(45 + (loadTrend * 25) + (source.consecutiveMisses * 8));
  const readinessScore = clampPercent(100 - fatigueScore + (source.activeStreakDays >= 3 ? 5 : 0));
  const streakAtRisk = source.consecutiveMisses >= 1;

  return {
    athleteReadiness: {
      memberId: source.memberId,
      readinessScore,
      fatigueScore,
      capturedAt,
    },
    weeklyProgress: {
      memberId: source.memberId,
      weekStartDate: source.weekStartDate,
      plannedWorkoutCount: planned,
      completedWorkoutCount: completed,
      capturedAt,
    },
    streakHealth: {
      memberId: source.memberId,
      activeStreakDays: Math.max(0, source.activeStreakDays),
      lastCompletedDate: source.lastCompletedDate ?? "",
      streakAtRisk,
      capturedAt,
    },
  };
}

export function emitFitnessSignal(input: {
  memberId: string;
  signalType: FitnessSignalType;
  payload: FitnessSignalPayload;
  emittedAt: Date | string;
  reason: FitnessOutboundReason;
}): FitnessOutboundSignal {
  const outbound: FitnessOutboundSignal = {
    fixtureId: `fitness-live-signal-${input.signalType}-${createOutboundId("sig")}`,
    outboundId: createOutboundId("out"),
    emittedAt: isoNow(input.emittedAt),
    appId: fitnessIntegrationContract.identity.appId,
    signalType: input.signalType,
    routing: getSignalRouting(input.signalType),
    payload: input.payload,
    reason: input.reason,
  };

  const state = getOrCreateMemberDebugState(input.memberId);
  pushBounded(state.signals, outbound);
  return outbound;
}

function emitSnapshot(input: {
  memberId: string;
  snapshotType: FitnessStateSnapshotType;
  payload: FitnessSnapshotPayload;
  capturedAt: Date | string;
  reason: FitnessOutboundReason;
}): FitnessOutboundSnapshot {
  const outbound: FitnessOutboundSnapshot = {
    fixtureId: `fitness-live-snapshot-${input.snapshotType}-${createOutboundId("snap")}`,
    outboundId: createOutboundId("out"),
    capturedAt: isoNow(input.capturedAt),
    appId: fitnessIntegrationContract.identity.appId,
    snapshotType: input.snapshotType,
    snapshot: input.payload,
    reason: input.reason,
  };

  const state = getOrCreateMemberDebugState(input.memberId);
  pushBounded(state.snapshots, outbound);
  return outbound;
}

export function ingestFitnessReceipt(receipt: FitnessInboundReceipt): FitnessInboundReceipt {
  const state = getOrCreateMemberDebugState(receipt.memberId);
  pushBounded(state.receipts, receipt);
  return receipt;
}

export function getFitnessIntegrationDebugState(memberId: string): FitnessIntegrationDebugState {
  const state = debugStateByMember.get(memberId);
  if (!state) {
    return {
      emittedSignals: [],
      exportedSnapshots: [],
      receipts: [],
    };
  }

  return {
    emittedSignals: [...state.signals],
    exportedSnapshots: [...state.snapshots],
    receipts: [...state.receipts],
  };
}

function evaluateSignalsFromSourceState(source: FitnessSnapshotSourceState, reason: FitnessOutboundReason): FitnessOutboundSignal[] {
  const emitted: FitnessOutboundSignal[] = [];
  const snapshots = buildFitnessSnapshots(source);

  if (source.completedWorkoutCount >= source.plannedWorkoutCount && source.plannedWorkoutCount > 0) {
    emitted.push(emitFitnessSignal({
      memberId: source.memberId,
      signalType: "weekly_goal_hit",
      emittedAt: source.capturedAt,
      reason,
      payload: {
        memberId: source.memberId,
        weekStartDate: source.weekStartDate,
        workoutsPlanned: source.plannedWorkoutCount,
        workoutsCompleted: source.completedWorkoutCount,
        achievedAt: isoNow(source.capturedAt),
      },
    }));
  }

  const readiness = Number(snapshots.athleteReadiness.readinessScore);
  const fatigue = Number(snapshots.athleteReadiness.fatigueScore);
  if (readiness <= 35 || fatigue >= 70) {
    emitted.push(emitFitnessSignal({
      memberId: source.memberId,
      signalType: "recovery_warning",
      emittedAt: source.capturedAt,
      reason: "recovery_evaluation",
      payload: {
        memberId: source.memberId,
        readinessScore: readiness,
        fatigueScore: fatigue,
        warningLevel: readiness <= 20 || fatigue >= 85 ? "critical" : "warning",
        observedAt: isoNow(source.capturedAt),
      },
    }));
  }

  if (source.consecutiveMisses > 0 && source.lastMissedSessionDate) {
    emitted.push(emitFitnessSignal({
      memberId: source.memberId,
      signalType: "workout_missed",
      emittedAt: source.capturedAt,
      reason,
      payload: {
        memberId: source.memberId,
        sessionId: source.inProgressSessionId ?? `missed-${source.lastMissedSessionDate}`,
        scheduledAt: `${source.lastMissedSessionDate}T00:00:00.000Z`,
        missReasonCode: "no_check_in",
        consecutiveMisses: source.consecutiveMisses,
      },
    }));
  }

  if (source.activeStreakDays === 0 && source.lastCompletedDate && source.consecutiveMisses > 0) {
    emitted.push(emitFitnessSignal({
      memberId: source.memberId,
      signalType: "streak_broken",
      emittedAt: source.capturedAt,
      reason: "streak_evaluation",
      payload: {
        memberId: source.memberId,
        streakDaysBeforeBreak: 1,
        breakDate: toDateOnly(isoNow(source.capturedAt)),
        lastCompletedWorkoutAt: `${source.lastCompletedDate}T00:00:00.000Z`,
        breakReasonCode: "missed_planned_session",
      },
    }));
  }

  return emitted;
}

export const fitnessIntegrationClient = {
  packageSignal(input: {
    memberId: string;
    signalType: FitnessSignalType;
    payload: FitnessSignalPayload;
    reason: FitnessOutboundReason;
    emittedAt: Date | string;
  }) {
    return emitFitnessSignal(input);
  },

  packageSnapshots(input: {
    memberId: string;
    source: FitnessSnapshotSourceState;
    reason: FitnessOutboundReason;
  }) {
    const payload = buildFitnessSnapshots(input.source);

    const exported = [
      emitSnapshot({
        memberId: input.memberId,
        snapshotType: "athlete_readiness_state",
        payload: payload.athleteReadiness,
        capturedAt: input.source.capturedAt,
        reason: input.reason,
      }),
      emitSnapshot({
        memberId: input.memberId,
        snapshotType: "weekly_progress_state",
        payload: payload.weeklyProgress,
        capturedAt: input.source.capturedAt,
        reason: input.reason,
      }),
      emitSnapshot({
        memberId: input.memberId,
        snapshotType: "streak_health_state",
        payload: payload.streakHealth,
        capturedAt: input.source.capturedAt,
        reason: input.reason,
      }),
    ] as const;

    return {
      snapshots: payload,
      exported,
    };
  },

  evaluateAndPackageSignals(input: {
    source: FitnessSnapshotSourceState;
    reason: FitnessOutboundReason;
  }) {
    return evaluateSignalsFromSourceState(input.source, input.reason);
  },

  ingestReceipt: ingestFitnessReceipt,
  getDebugState: getFitnessIntegrationDebugState,
};

export async function buildFitnessSnapshotSourceState(params: {
  memberId: string;
  now: Date | string;
  fetcher: {
    getRoutineDayPlanCountForCurrentWeek(memberId: string, weekStartDate: string): Promise<number>;
    getCompletedWorkoutCountForCurrentWeek(memberId: string, weekStartDate: string): Promise<number>;
    getCompletedSessions(memberId: string, days: number, now: string): Promise<Array<{ performedAt: string; durationSeconds: number | null }>>;
    getConsecutiveMisses(memberId: string, now: string): Promise<{ consecutiveMisses: number; lastMissedSessionDate: string | null }>;
    getInProgressSessionSummary(memberId: string): Promise<{ inProgressSessionId: string | null; inProgressExerciseCount: number }>;
  };
}): Promise<FitnessSnapshotSourceState> {
  const nowIso = isoNow(params.now);
  const weekStartDate = startOfIsoWeek(nowIso);

  const [
    plannedWorkoutCount,
    completedWorkoutCount,
    completedSessions14,
    misses,
    inProgressSummary,
  ] = await Promise.all([
    params.fetcher.getRoutineDayPlanCountForCurrentWeek(params.memberId, weekStartDate),
    params.fetcher.getCompletedWorkoutCountForCurrentWeek(params.memberId, weekStartDate),
    params.fetcher.getCompletedSessions(params.memberId, 14, nowIso),
    params.fetcher.getConsecutiveMisses(params.memberId, nowIso),
    params.fetcher.getInProgressSessionSummary(params.memberId),
  ]);

  const completedSorted = completedSessions14
    .map((entry) => ({
      performedAt: isoNow(entry.performedAt),
      durationSeconds: entry.durationSeconds,
    }))
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));

  const minutesLast7Days = sumMinutesSince(completedSorted, nowIso, 7);
  const minutesPrevious7Days = sumMinutesBetween(completedSorted, nowIso, 14, 7);

  const activeStreakDays = computeActiveStreakDays(completedSorted, nowIso);
  const lastCompletedDate = completedSorted.length > 0 ? toDateOnly(completedSorted[0].performedAt) : null;

  return {
    memberId: params.memberId,
    capturedAt: nowIso,
    weekStartDate,
    plannedWorkoutCount,
    completedWorkoutCount,
    activeStreakDays,
    lastCompletedDate,
    consecutiveMisses: misses.consecutiveMisses,
    lastMissedSessionDate: misses.lastMissedSessionDate,
    completedMinutesLast7Days: minutesLast7Days,
    completedMinutesPrevious7Days: minutesPrevious7Days,
    inProgressSessionId: inProgressSummary.inProgressSessionId,
    inProgressExerciseCount: inProgressSummary.inProgressExerciseCount,
  };
}

function startOfIsoWeek(iso: string): string {
  const date = new Date(iso);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

function sumMinutesSince(
  sessions: Array<{ performedAt: string; durationSeconds: number | null }>,
  nowIso: string,
  daysBack: number,
): number {
  const end = new Date(nowIso).getTime();
  const start = end - (daysBack * 24 * 60 * 60 * 1000);
  const minutes = sessions.reduce((total, session) => {
    const time = new Date(session.performedAt).getTime();
    if (time < start || time > end) return total;
    return total + Math.max(0, Math.floor((session.durationSeconds ?? 0) / 60));
  }, 0);
  return minutes;
}

function sumMinutesBetween(
  sessions: Array<{ performedAt: string; durationSeconds: number | null }>,
  nowIso: string,
  olderDaysBack: number,
  newerDaysBack: number,
): number {
  const end = new Date(nowIso).getTime() - (newerDaysBack * 24 * 60 * 60 * 1000);
  const start = new Date(nowIso).getTime() - (olderDaysBack * 24 * 60 * 60 * 1000);
  const minutes = sessions.reduce((total, session) => {
    const time = new Date(session.performedAt).getTime();
    if (time < start || time > end) return total;
    return total + Math.max(0, Math.floor((session.durationSeconds ?? 0) / 60));
  }, 0);
  return minutes;
}

function computeActiveStreakDays(sessions: Array<{ performedAt: string }>, nowIso: string): number {
  const uniqueDays = new Set(sessions.map((session) => toDateOnly(session.performedAt)));
  const cursor = new Date(nowIso);
  cursor.setUTCHours(0, 0, 0, 0);

  let streak = 0;
  for (;;) {
    const day = cursor.toISOString().slice(0, 10);
    if (uniqueDays.has(day)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      const previousDay = cursor.toISOString().slice(0, 10);
      if (uniqueDays.has(previousDay)) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
        continue;
      }
    }

    break;
  }

  return streak;
}
