export type LoadingDiagnosticStatus = "pending" | "resolved" | "error" | "redirected";
export type LoadingDiagnosticSource = "client" | "server";
export type LoadingDiagnosticMetadata = Record<string, unknown>;

export type LoadingDiagnosticEntry = {
  id: string;
  gate: string;
  route: string | null;
  source: LoadingDiagnosticSource;
  startedAt: string;
  resolvedAt: string | null;
  durationMs: number | null;
  status: LoadingDiagnosticStatus;
  blockingReason: string | null;
  metadata: LoadingDiagnosticMetadata | null;
  timeoutMs: number | null;
  timedOutAt: string | null;
};

type LoadingDiagnosticUpdate = {
  blockingReason?: string | null;
  metadata?: LoadingDiagnosticMetadata | null;
};

type LoadingDiagnosticGateOptions = {
  gate: string;
  route?: string | null;
  source: LoadingDiagnosticSource;
  blockingReason?: string | null;
  metadata?: LoadingDiagnosticMetadata | null;
  timeoutMs?: number | null;
  collector?: LoadingDiagnosticsCollector | null;
};

type LoadingDiagnosticErrorUpdate = LoadingDiagnosticUpdate & {
  error?: unknown;
};

type BrowserLoadingDiagnosticsStore = {
  entries: LoadingDiagnosticEntry[];
  updatedAt: string;
};

export const LOADING_DIAGNOSTICS_WINDOW_STORE_KEY = "__FAWXZZY_LOADING_DIAGNOSTICS__";
export const LOADING_DIAGNOSTICS_STORAGE_KEY = "fawxzzy:loading-diagnostics";

declare global {
  interface Window {
    __FAWXZZY_LOADING_DIAGNOSTICS__?: BrowserLoadingDiagnosticsStore;
  }
}

function canUseBrowser() {
  return typeof window !== "undefined";
}

function toIso(timestamp: number) {
  return new Date(timestamp).toISOString();
}

function normalizeReason(reason: string | null | undefined) {
  if (typeof reason !== "string") {
    return null;
  }

  const trimmed = reason.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeMetadata(metadata: LoadingDiagnosticMetadata | null | undefined) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  function sanitizeValue(value: unknown): unknown {
    if (
      value === null
      || typeof value === "string"
      || typeof value === "number"
      || typeof value === "boolean"
    ) {
      return value;
    }

    if (typeof value === "bigint") {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item)).filter((item) => item !== undefined);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
      };
    }

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)] as const)
          .filter(([, nestedValue]) => nestedValue !== undefined),
      );
    }

    return String(value);
  }

  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [key, sanitizeValue(value)] as const)
      .filter(([, value]) => value !== undefined),
  );
}

function describeUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown loading diagnostic error";
}

function mergeMetadata(
  current: LoadingDiagnosticMetadata | null,
  next: LoadingDiagnosticMetadata | null | undefined,
) {
  const sanitized = sanitizeMetadata(next);
  if (!sanitized) {
    return current;
  }

  return {
    ...(current ?? {}),
    ...sanitized,
  };
}

function buildEntryId(args: {
  source: LoadingDiagnosticSource;
  route: string | null;
  gate: string;
}) {
  const routePart = args.route ?? "unknown-route";
  return `${args.source}:${routePart}:${args.gate}`;
}

function shouldUseBrowserStorageOverride() {
  if (!canUseBrowser()) {
    return false;
  }

  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (
      searchParams.get("loading-diagnostics") === "1"
      || searchParams.get("loadingDiagnostics") === "1"
    ) {
      return true;
    }

    const localValue = window.localStorage.getItem(LOADING_DIAGNOSTICS_STORAGE_KEY);
    const sessionValue = window.sessionStorage.getItem(LOADING_DIAGNOSTICS_STORAGE_KEY);
    return localValue === "1" || sessionValue === "1" || localValue === "true" || sessionValue === "true";
  } catch {
    return false;
  }
}

export function isLoadingDiagnosticsEnabled() {
  if (process.env.NEXT_PUBLIC_LOADING_DIAGNOSTICS === "1") {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return shouldUseBrowserStorageOverride();
}

function readBrowserStore(): BrowserLoadingDiagnosticsStore {
  if (!canUseBrowser()) {
    return {
      entries: [],
      updatedAt: toIso(Date.now()),
    };
  }

  if (!window[LOADING_DIAGNOSTICS_WINDOW_STORE_KEY]) {
    window[LOADING_DIAGNOSTICS_WINDOW_STORE_KEY] = {
      entries: [],
      updatedAt: toIso(Date.now()),
    };
  }

  return window[LOADING_DIAGNOSTICS_WINDOW_STORE_KEY]!;
}

function upsertBrowserEntry(entry: LoadingDiagnosticEntry) {
  if (!canUseBrowser() || !isLoadingDiagnosticsEnabled()) {
    return;
  }

  const store = readBrowserStore();
  const nextEntries = store.entries.filter((current) => current.id !== entry.id);
  nextEntries.push(entry);
  nextEntries.sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  window[LOADING_DIAGNOSTICS_WINDOW_STORE_KEY] = {
    entries: nextEntries,
    updatedAt: toIso(Date.now()),
  };
}

function logDiagnosticEntry(entry: LoadingDiagnosticEntry) {
  if (!isLoadingDiagnosticsEnabled()) {
    return;
  }

  const prefix = "[loading-diagnostics]";
  if (entry.status === "error") {
    console.error(prefix, entry);
    return;
  }

  if (entry.status === "pending" && entry.timedOutAt) {
    console.warn(prefix, entry);
    return;
  }

  console.info(prefix, entry);
}

function publishEntry(entry: LoadingDiagnosticEntry, collector?: LoadingDiagnosticsCollector | null) {
  collector?.upsert(entry);
  upsertBrowserEntry(entry);
  logDiagnosticEntry(entry);
}

function maybeArmTimeout(args: {
  timeoutMs: number | null;
  isSettled: () => boolean;
  onTimeout: () => void;
}) {
  if (!args.timeoutMs || args.timeoutMs <= 0) {
    return null;
  }

  const timeoutId = globalThis.setTimeout(() => {
    if (args.isSettled()) {
      return;
    }

    args.onTimeout();
  }, args.timeoutMs);

  if (typeof (timeoutId as { unref?: () => void }).unref === "function") {
    (timeoutId as { unref: () => void }).unref();
  }

  return timeoutId;
}

export function startLoadingDiagnosticGate(options: LoadingDiagnosticGateOptions) {
  const route = options.route ?? null;
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : null;
  const startedAtMs = Date.now();
  let settled = false;
  let currentEntry: LoadingDiagnosticEntry = {
    id: buildEntryId({
      source: options.source,
      route,
      gate: options.gate,
    }),
    gate: options.gate,
    route,
    source: options.source,
    startedAt: toIso(startedAtMs),
    resolvedAt: null,
    durationMs: null,
    status: "pending",
    blockingReason: normalizeReason(options.blockingReason),
    metadata: sanitizeMetadata(options.metadata),
    timeoutMs,
    timedOutAt: null,
  };

  const publish = () => {
    publishEntry(currentEntry, options.collector);
  };

  publish();

  const timeoutId = maybeArmTimeout({
    timeoutMs,
    isSettled: () => settled,
    onTimeout: () => {
      currentEntry = {
        ...currentEntry,
        timedOutAt: toIso(Date.now()),
      };
      publish();
    },
  });

  const clearTimeoutIfNeeded = () => {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  };

  const updatePending = (update?: LoadingDiagnosticUpdate) => {
    if (settled) {
      return currentEntry;
    }

    currentEntry = {
      ...currentEntry,
      status: "pending",
      blockingReason: normalizeReason(update?.blockingReason) ?? currentEntry.blockingReason,
      metadata: mergeMetadata(currentEntry.metadata, update?.metadata),
    };
    publish();
    return currentEntry;
  };

  const settle = (status: Exclude<LoadingDiagnosticStatus, "pending">, update?: LoadingDiagnosticErrorUpdate) => {
    if (settled) {
      return currentEntry;
    }

    settled = true;
    clearTimeoutIfNeeded();
    const resolvedAtMs = Date.now();
    const derivedReason = update?.error ? describeUnknownError(update.error) : null;
    currentEntry = {
      ...currentEntry,
      status,
      resolvedAt: toIso(resolvedAtMs),
      durationMs: resolvedAtMs - startedAtMs,
      blockingReason: normalizeReason(update?.blockingReason) ?? derivedReason ?? currentEntry.blockingReason,
      metadata: mergeMetadata(currentEntry.metadata, update?.metadata),
    };
    publish();
    return currentEntry;
  };

  return {
    pending(update?: LoadingDiagnosticUpdate) {
      return updatePending(update);
    },
    resolve(update?: LoadingDiagnosticUpdate) {
      return settle("resolved", update);
    },
    redirect(update?: LoadingDiagnosticUpdate) {
      return settle("redirected", update);
    },
    error(errorOrUpdate?: unknown | LoadingDiagnosticErrorUpdate, update?: LoadingDiagnosticUpdate) {
      const normalizedUpdate = (
        errorOrUpdate
        && typeof errorOrUpdate === "object"
        && !("name" in (errorOrUpdate as Record<string, unknown>))
        && !("message" in (errorOrUpdate as Record<string, unknown>))
      )
        ? errorOrUpdate as LoadingDiagnosticErrorUpdate
        : {
            ...(update ?? {}),
            error: errorOrUpdate,
          };
      return settle("error", normalizedUpdate);
    },
    snapshot() {
      return currentEntry;
    },
  };
}

export function publishLoadingDiagnostics(entries: LoadingDiagnosticEntry[]) {
  if (!canUseBrowser() || !isLoadingDiagnosticsEnabled()) {
    return;
  }

  for (const entry of entries) {
    upsertBrowserEntry(entry);
    logDiagnosticEntry(entry);
  }
}

export function readPublishedLoadingDiagnostics() {
  if (!canUseBrowser()) {
    return [] as LoadingDiagnosticEntry[];
  }

  return readBrowserStore().entries;
}

export class LoadingDiagnosticsCollector {
  private readonly entries = new Map<string, LoadingDiagnosticEntry>();

  constructor(private readonly route: string) {}

  upsert(entry: LoadingDiagnosticEntry) {
    this.entries.set(entry.id, entry);
  }

  startGate(args: Omit<LoadingDiagnosticGateOptions, "collector" | "route" | "source">) {
    return startLoadingDiagnosticGate({
      ...args,
      collector: this,
      route: this.route,
      source: "server",
    });
  }

  async measure<T>(
    gate: string,
    action: () => Promise<T>,
    args?: Omit<LoadingDiagnosticGateOptions, "collector" | "gate" | "route" | "source">,
  ) {
    const handle = this.startGate({
      gate,
      blockingReason: args?.blockingReason,
      metadata: args?.metadata,
      timeoutMs: args?.timeoutMs,
    });

    try {
      const result = await action();
      handle.resolve();
      return result;
    } catch (error) {
      handle.error(error);
      throw error;
    }
  }

  snapshot() {
    return [...this.entries.values()].sort((left, right) => left.startedAt.localeCompare(right.startedAt));
  }
}
