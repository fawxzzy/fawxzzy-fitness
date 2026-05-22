export type QualificationWindowMode =
  | "latest"
  | "consecutive"
  | "within_cycle";

export type QualificationWindowConfig = {
  requiredQualifiedSessions?: number;
  mode?: QualificationWindowMode;
  resetOnMiss?: boolean;
};

export type NormalizedQualificationWindowConfig = {
  requiredQualifiedSessions: number;
  mode: QualificationWindowMode;
  resetOnMiss: boolean;
};

export type QualificationWindowEvidenceSession = {
  sessionId: string;
  performedAt: string;
  qualified: boolean;
};

export type QualificationWindowCycleWindow = {
  startDate?: string | null;
  endDate?: string | null;
};

export type QualificationWindowStatus = {
  config: NormalizedQualificationWindowConfig;
  supported: boolean;
  satisfied: boolean;
  qualifiedCount: number;
  requiredQualifiedSessions: number;
  matchedSessionIds: string[];
  streakReset: boolean;
  reason: "unsupported_cycle_window" | "waiting_for_more_qualified_sessions" | "satisfied";
  statusLine: string;
};

const DEFAULT_CONFIG: NormalizedQualificationWindowConfig = {
  requiredQualifiedSessions: 1,
  mode: "latest",
  resetOnMiss: false,
};

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function normalizeRequiredQualifiedSessions(value: unknown) {
  if (!isPositiveInteger(value)) {
    return DEFAULT_CONFIG.requiredQualifiedSessions;
  }

  return Math.min(5, Math.max(1, value));
}

function normalizeQualificationWindowMode(value: unknown): QualificationWindowMode {
  return value === "consecutive" || value === "within_cycle" ? value : "latest";
}

function normalizeCycleTimestamp(value: string | null | undefined) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildStatusLine(args: {
  qualifiedCount: number;
  requiredQualifiedSessions: number;
  streakReset: boolean;
}) {
  const base = `${args.qualifiedCount} of ${args.requiredQualifiedSessions} qualifying sessions complete`;
  return args.streakReset ? `${base} · streak reset after miss` : base;
}

function sortEvidenceSessions(evidence: QualificationWindowEvidenceSession[]) {
  return [...evidence].sort((left, right) => right.performedAt.localeCompare(left.performedAt));
}

function resolveLatestWindow(evidence: QualificationWindowEvidenceSession[], requiredQualifiedSessions: number) {
  const matched = evidence.filter((session) => session.qualified).slice(0, requiredQualifiedSessions);
  return {
    qualifiedCount: matched.length,
    matchedSessionIds: matched.map((session) => session.sessionId),
    streakReset: false,
  };
}

function resolveConsecutiveWindow(args: {
  evidence: QualificationWindowEvidenceSession[];
  requiredQualifiedSessions: number;
  resetOnMiss: boolean;
}) {
  if (args.resetOnMiss) {
    const matched: QualificationWindowEvidenceSession[] = [];
    let streakReset = false;

    for (let index = 0; index < args.evidence.length; index += 1) {
      const session = args.evidence[index];
      if (session.qualified) {
        matched.push(session);
        if (matched.length >= args.requiredQualifiedSessions) {
          break;
        }
        continue;
      }

      if (args.evidence.slice(index + 1).some((entry) => entry.qualified)) {
        streakReset = true;
      }
      break;
    }

    return {
      qualifiedCount: matched.length,
      matchedSessionIds: matched.map((session) => session.sessionId),
      streakReset,
    };
  }

  let best: QualificationWindowEvidenceSession[] = [];
  let current: QualificationWindowEvidenceSession[] = [];

  for (const session of args.evidence) {
    if (session.qualified) {
      current.push(session);
      if (current.length > best.length) {
        best = [...current];
      }
      continue;
    }

    current = [];
  }

  return {
    qualifiedCount: Math.min(best.length, args.requiredQualifiedSessions),
    matchedSessionIds: best.slice(0, args.requiredQualifiedSessions).map((session) => session.sessionId),
    streakReset: false,
  };
}

function resolveWithinCycleEvidence(args: {
  evidence: QualificationWindowEvidenceSession[];
  cycleWindow?: QualificationWindowCycleWindow | null;
}) {
  const startTs = normalizeCycleTimestamp(args.cycleWindow?.startDate ?? null);
  const endTs = normalizeCycleTimestamp(args.cycleWindow?.endDate ?? null);

  if (startTs === null || endTs === null || endTs < startTs) {
    return null;
  }

  return args.evidence.filter((session) => {
    const performedAtTs = normalizeCycleTimestamp(session.performedAt);
    return performedAtTs !== null && performedAtTs >= startTs && performedAtTs <= endTs;
  });
}

export function normalizeQualificationWindow(input: unknown): NormalizedQualificationWindowConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_CONFIG };
  }

  const raw = input as QualificationWindowConfig;
  return {
    requiredQualifiedSessions: normalizeRequiredQualifiedSessions(raw.requiredQualifiedSessions),
    mode: normalizeQualificationWindowMode(raw.mode),
    resetOnMiss: raw.resetOnMiss === true,
  };
}

export function countQualifiedSessions(args: {
  config?: QualificationWindowConfig | null;
  evidence: QualificationWindowEvidenceSession[];
  cycleWindow?: QualificationWindowCycleWindow | null;
}) {
  const config = normalizeQualificationWindow(args.config);
  const evidence = sortEvidenceSessions(args.evidence);

  if (config.mode === "within_cycle") {
    const withinCycle = resolveWithinCycleEvidence({
      evidence,
      cycleWindow: args.cycleWindow,
    });
    if (!withinCycle) {
      return {
        config,
        supported: false,
        qualifiedCount: 0,
        matchedSessionIds: [] as string[],
        streakReset: false,
      };
    }

    const matched = withinCycle.filter((session) => session.qualified).slice(0, config.requiredQualifiedSessions);
    return {
      config,
      supported: true,
      qualifiedCount: matched.length,
      matchedSessionIds: matched.map((session) => session.sessionId),
      streakReset: false,
    };
  }

  if (config.mode === "consecutive") {
    return {
      config,
      supported: true,
      ...resolveConsecutiveWindow({
        evidence,
        requiredQualifiedSessions: config.requiredQualifiedSessions,
        resetOnMiss: config.resetOnMiss,
      }),
    };
  }

  return {
    config,
    supported: true,
    ...resolveLatestWindow(evidence, config.requiredQualifiedSessions),
  };
}

export function resolveQualificationWindowStatus(args: {
  config?: QualificationWindowConfig | null;
  evidence: QualificationWindowEvidenceSession[];
  cycleWindow?: QualificationWindowCycleWindow | null;
}): QualificationWindowStatus {
  const counted = countQualifiedSessions(args);
  const satisfied = counted.supported && counted.qualifiedCount >= counted.config.requiredQualifiedSessions;

  if (!counted.supported) {
    return {
      config: counted.config,
      supported: false,
      satisfied: false,
      qualifiedCount: 0,
      requiredQualifiedSessions: counted.config.requiredQualifiedSessions,
      matchedSessionIds: [],
      streakReset: false,
      reason: "unsupported_cycle_window",
      statusLine: "Qualification window needs cycle dates",
    };
  }

  return {
    config: counted.config,
    supported: true,
    satisfied,
    qualifiedCount: counted.qualifiedCount,
    requiredQualifiedSessions: counted.config.requiredQualifiedSessions,
    matchedSessionIds: counted.matchedSessionIds,
    streakReset: counted.streakReset,
    reason: satisfied ? "satisfied" : "waiting_for_more_qualified_sessions",
    statusLine: buildStatusLine({
      qualifiedCount: counted.qualifiedCount,
      requiredQualifiedSessions: counted.config.requiredQualifiedSessions,
      streakReset: counted.streakReset,
    }),
  };
}

export function isQualificationWindowSatisfied(args: {
  config?: QualificationWindowConfig | null;
  evidence: QualificationWindowEvidenceSession[];
  cycleWindow?: QualificationWindowCycleWindow | null;
}) {
  return resolveQualificationWindowStatus(args).satisfied;
}
