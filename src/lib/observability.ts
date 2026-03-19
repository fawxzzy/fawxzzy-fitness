const DEBUG_OBSERVABILITY_FLAG = "FAWXZZY_DEBUG_OBSERVABILITY";

export function isSteadyStateDebugLoggingEnabled() {
  return process.env.NODE_ENV !== "production" && process.env[DEBUG_OBSERVABILITY_FLAG] === "1";
}

export function logDebugSummary(scope: string, message: string, details?: Record<string, unknown>) {
  if (!isSteadyStateDebugLoggingEnabled()) {
    return;
  }

  console.info(`[${scope}] ${message}`, details ?? {});
}

export { DEBUG_OBSERVABILITY_FLAG };
