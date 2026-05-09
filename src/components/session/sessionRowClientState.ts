type SessionRowStateSource = {
  id: string;
  loggedSetCount: number;
  isSkipped: boolean;
};

export type SessionRowClientState = {
  loggedSetCount: number;
  setCountOverrideActive: boolean;
  isSkipped: boolean;
  isQuickLogPending: boolean;
  isSkipPending: boolean;
  showWhenCompleted: boolean;
};

function createDefaultRowState(source: SessionRowStateSource): SessionRowClientState {
  return {
    loggedSetCount: source.loggedSetCount,
    setCountOverrideActive: false,
    isSkipped: source.isSkipped,
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
      return [row.id, {
        loggedSetCount: shouldPreserveLocalCount ? previous!.loggedSetCount : serverLoggedSetCount,
        setCountOverrideActive: shouldPreserveLocalCount,
        isSkipped: row.isSkipped,
        isQuickLogPending: previous?.isQuickLogPending ?? false,
        isSkipPending: previous?.isSkipPending ?? false,
        showWhenCompleted: previous?.showWhenCompleted ?? false,
      } satisfies SessionRowClientState];
    }),
  );
}
