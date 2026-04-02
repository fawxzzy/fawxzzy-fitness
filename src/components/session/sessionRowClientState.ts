type SessionRowStateSource = {
  id: string;
  loggedSetCount: number;
  isSkipped: boolean;
};

export type SessionRowClientState = {
  loggedSetCount: number;
  isSkipped: boolean;
  isQuickLogPending: boolean;
  isSkipPending: boolean;
};

function createDefaultRowState(source: SessionRowStateSource): SessionRowClientState {
  return {
    loggedSetCount: source.loggedSetCount,
    isSkipped: source.isSkipped,
    isQuickLogPending: false,
    isSkipPending: false,
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
      return [row.id, {
        loggedSetCount: mergedLoggedSetCount[row.id] ?? row.loggedSetCount,
        isSkipped: row.isSkipped,
        isQuickLogPending: previous?.isQuickLogPending ?? false,
        isSkipPending: previous?.isSkipPending ?? false,
      } satisfies SessionRowClientState];
    }),
  );
}
