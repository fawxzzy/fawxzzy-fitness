type SessionRowStateSource = {
  id: string;
  loggedSetCount: number;
  isSkipped: boolean;
};

export type SessionRowClientState = {
  loggedSetCount: number;
  setCountOverrideActive: boolean;
  isSkipped: boolean;
  isSkipOverrideActive: boolean;
  isQuickLogPending: boolean;
  isSkipPending: boolean;
  showWhenCompleted: boolean;
};

function createDefaultRowState(source: SessionRowStateSource): SessionRowClientState {
  return {
    loggedSetCount: source.loggedSetCount,
    setCountOverrideActive: false,
    isSkipped: source.isSkipped,
    isSkipOverrideActive: false,
    isQuickLogPending: false,
    isSkipPending: false,
    showWhenCompleted: false,
  };
}

export function buildInitialSessionRowClientState(rows: SessionRowStateSource[]): Record<string, SessionRowClientState> {
  return Object.fromEntries(rows.map((row) => [row.id, createDefaultRowState(row)]));
}

export function reconcileSessionRowClientState({
  current,
  rows,
  mergedLoggedSetCount,
}: {
  current: Record<string, SessionRowClientState>;
  rows: SessionRowStateSource[];
  mergedLoggedSetCount: Record<string, number>;
}): Record<string, SessionRowClientState> {
  return Object.fromEntries(
    rows.map((row) => {
      const previous = current[row.id];
      const serverLoggedSetCount = mergedLoggedSetCount[row.id] ?? row.loggedSetCount;
      const shouldPreserveLocalCount = Boolean(previous?.setCountOverrideActive && serverLoggedSetCount !== previous.loggedSetCount);
      // Mirrors shouldPreserveLocalCount above: a locally-toggled skip state
      // (isSkipOverrideActive) must not be silently overwritten by a stale
      // `rows` snapshot (e.g. an unrelated revalidate triggered by a timer
      // command on a different exercise) until the server-provided value
      // actually catches up to what we last told it. Once it catches up,
      // the override is cleared so a genuinely newer/independent server
      // value (a real external change) can reconcile normally afterwards.
      const shouldPreserveLocalSkip = Boolean(previous?.isSkipOverrideActive && row.isSkipped !== previous.isSkipped);
      return [row.id, {
        loggedSetCount: shouldPreserveLocalCount ? previous!.loggedSetCount : serverLoggedSetCount,
        setCountOverrideActive: shouldPreserveLocalCount,
        isSkipped: shouldPreserveLocalSkip ? previous!.isSkipped : row.isSkipped,
        isSkipOverrideActive: shouldPreserveLocalSkip,
        isQuickLogPending: previous?.isQuickLogPending ?? false,
        isSkipPending: previous?.isSkipPending ?? false,
        showWhenCompleted: previous?.showWhenCompleted ?? false,
      } satisfies SessionRowClientState];
    }),
  );
}
