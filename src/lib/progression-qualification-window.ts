export const QUALIFICATION_WINDOW_MODES = [
  "latest",
  "consecutive",
  "within_cycle",
] as const;

export type QualificationWindowMode = (typeof QUALIFICATION_WINDOW_MODES)[number];

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

export type QualificationSessionEvidence = {
  sessionId: string;
  performedAt?: string | Date | null;
  qualified: boolean;
  reason?: string;
};

export type QualificationWindowCycleWindow = {
  startDate?: string | null;
  endDate?: string | null;
};

export type QualificationWindowResultStatus =
  | "qualified"
  | "partial"
  | "not_qualified"
  | "insufficient_evidence"
  | "unsupported";

export type QualificationWindowResult = {
  ready: boolean;
  requiredQualifiedSessions: number;
  qualifiedSessions: number;
  mode: QualificationWindowMode;
  resetOnMiss: boolean;
  status: QualificationWindowResultStatus;
  summary: string;
};

export const DEFAULT_QUALIFICATION_WINDOW_MODE: QualificationWindowMode = "latest";
export const DEFAULT_REQUIRED_QUALIFIED_SESSIONS = 1;
export const MAX_REQUIRED_QUALIFIED_SESSIONS = 5;

const QUALIFICATION_WINDOW_MODE_SET = new Set<QualificationWindowMode>(QUALIFICATION_WINDOW_MODES);

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function clampRequiredQualifiedSessions(value: unknown) {
  if (!isPositiveInteger(value)) {
    return DEFAULT_REQUIRED_QUALIFIED_SESSIONS;
  }

  return Math.min(MAX_REQUIRED_QUALIFIED_SESSIONS, Math.max(1, value));
}

function resolveMode(value: unknown): QualificationWindowMode {
  return QUALIFICATION_WINDOW_MODE_SET.has(value as QualificationWindowMode)
    ? (value as QualificationWindowMode)
    : DEFAULT_QUALIFICATION_WINDOW_MODE;
}

function formatCountSummary(count: number, required: number) {
  return `${count} of ${required} qualifying sessions complete`;
}

function buildResult(args: {
  config: NormalizedQualificationWindowConfig;
  qualifiedSessions: number;
  status: QualificationWindowResultStatus;
  summary: string;
}) {
  return {
    ready: args.status === "qualified",
    requiredQualifiedSessions: args.config.requiredQualifiedSessions,
    qualifiedSessions: args.qualifiedSessions,
    mode: args.config.mode,
    resetOnMiss: args.config.resetOnMiss,
    status: args.status,
    summary: args.summary,
  } satisfies QualificationWindowResult;
}

function toUtcTimestamp(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function resolveCycleBounds(cycleWindow?: QualificationWindowCycleWindow | null) {
  if (!cycleWindow?.startDate || !cycleWindow?.endDate) {
    return null;
  }

  const start = Date.parse(`${cycleWindow.startDate}T00:00:00.000Z`);
  const end = Date.parse(`${cycleWindow.endDate}T23:59:59.999Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return { start, end };
}

export function normalizeQualificationWindowConfig(
  input: unknown,
): NormalizedQualificationWindowConfig {
  if (!input || typeof input !== "object") {
    return {
      requiredQualifiedSessions: DEFAULT_REQUIRED_QUALIFIED_SESSIONS,
      mode: DEFAULT_QUALIFICATION_WINDOW_MODE,
      resetOnMiss: false,
    };
  }

  const config = input as QualificationWindowConfig;
  return {
    requiredQualifiedSessions: clampRequiredQualifiedSessions(config.requiredQualifiedSessions),
    mode: resolveMode(config.mode),
    resetOnMiss: config.resetOnMiss === true,
  };
}

export function countQualifiedSessions(args: {
  config?: QualificationWindowConfig | NormalizedQualificationWindowConfig | null;
  evidence: QualificationSessionEvidence[];
  cycleWindow?: QualificationWindowCycleWindow | null;
}) {
  const config = normalizeQualificationWindowConfig(args.config);
  const evidence = [...args.evidence];

  if (config.mode === "within_cycle") {
    const bounds = resolveCycleBounds(args.cycleWindow);
    if (!bounds) {
      return {
        qualifiedSessions: 0,
        status: "unsupported" as const,
        summary: "Cycle window unavailable",
      };
    }

    const sessionsInWindow = evidence.filter((session) => {
      const performedAt = toUtcTimestamp(session.performedAt);
      return performedAt !== null && performedAt >= bounds.start && performedAt <= bounds.end;
    });

    if (sessionsInWindow.length === 0) {
      return {
        qualifiedSessions: 0,
        status: evidence.length === 0 ? "insufficient_evidence" as const : "not_qualified" as const,
        summary: formatCountSummary(0, config.requiredQualifiedSessions),
      };
    }

    const qualifiedSessions = sessionsInWindow.filter((session) => session.qualified).length;
    return {
      qualifiedSessions,
      status: qualifiedSessions >= config.requiredQualifiedSessions
        ? "qualified" as const
        : qualifiedSessions > 0
          ? "partial" as const
          : "not_qualified" as const,
      summary: formatCountSummary(qualifiedSessions, config.requiredQualifiedSessions),
    };
  }

  if (evidence.length === 0) {
    return {
      qualifiedSessions: 0,
      status: "insufficient_evidence" as const,
      summary: formatCountSummary(0, config.requiredQualifiedSessions),
    };
  }

  if (config.mode === "latest") {
    const qualifiedSessions = evidence.filter((session) => session.qualified).length;
    return {
      qualifiedSessions,
      status: qualifiedSessions >= config.requiredQualifiedSessions
        ? "qualified" as const
        : qualifiedSessions > 0
          ? "partial" as const
          : "not_qualified" as const,
      summary: formatCountSummary(qualifiedSessions, config.requiredQualifiedSessions),
    };
  }

  let qualifiedSessions = 0;
  let sawMiss = false;

  for (const session of evidence) {
    if (session.qualified) {
      qualifiedSessions += 1;
      if (qualifiedSessions >= config.requiredQualifiedSessions) {
        break;
      }
      continue;
    }

    sawMiss = true;
    if (config.resetOnMiss) {
      break;
    }
  }

  const streakResetAfterMiss = config.resetOnMiss && sawMiss && qualifiedSessions === 0;
  return {
    qualifiedSessions,
    status: qualifiedSessions >= config.requiredQualifiedSessions
      ? "qualified" as const
      : qualifiedSessions > 0
        ? "partial" as const
        : "not_qualified" as const,
    summary: streakResetAfterMiss
      ? "Streak reset after miss"
      : formatCountSummary(qualifiedSessions, config.requiredQualifiedSessions),
  };
}

export function buildQualificationWindowStatus(result: QualificationWindowResult) {
  return result.summary;
}

export function evaluateQualificationWindow(args: {
  config?: QualificationWindowConfig | NormalizedQualificationWindowConfig | null;
  evidence: QualificationSessionEvidence[];
  cycleWindow?: QualificationWindowCycleWindow | null;
}) {
  const config = normalizeQualificationWindowConfig(args.config);
  const counted = countQualifiedSessions({
    config,
    evidence: args.evidence,
    cycleWindow: args.cycleWindow,
  });

  return buildResult({
    config,
    qualifiedSessions: counted.qualifiedSessions,
    status: counted.status,
    summary: counted.summary,
  });
}
