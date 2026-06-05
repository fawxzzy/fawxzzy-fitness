"use client";

import type { SessionSummary } from "@/app/history/session-summary";

type HistorySessionSummaryCacheEntry = {
  summary: SessionSummary;
  cachedAt: number;
};

const STORAGE_KEY = "fawxzzy:history-session-summary-cache:v1";
const MAX_ENTRIES = 48;
const TTL_MS = 10 * 60 * 1000;
const memoryCache = new Map<string, HistorySessionSummaryCacheEntry>();

function canUseBrowser() {
  return typeof window !== "undefined";
}

function pruneEntries(entries: Map<string, HistorySessionSummaryCacheEntry>) {
  const now = Date.now();
  return new Map(
    [...entries.entries()]
      .filter(([, entry]) => now - entry.cachedAt <= TTL_MS)
      .sort((left, right) => right[1].cachedAt - left[1].cachedAt)
      .slice(0, MAX_ENTRIES),
  );
}

function syncFromStorage() {
  if (!canUseBrowser()) {
    return;
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as Array<[string, HistorySessionSummaryCacheEntry]>;
    if (!Array.isArray(parsed)) {
      return;
    }

    const stored = pruneEntries(new Map(parsed));
    for (const [sessionId, entry] of stored.entries()) {
      const current = memoryCache.get(sessionId);
      if (!current || current.cachedAt < entry.cachedAt) {
        memoryCache.set(sessionId, entry);
      }
    }
  } catch {
    // Ignore storage issues and keep using memory.
  }
}

function writeStorage() {
  if (!canUseBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...pruneEntries(memoryCache).entries()]));
  } catch {
    // Ignore storage issues and keep using memory.
  }
}

export function rememberHistorySessionSummary(summary: SessionSummary) {
  if (!summary.id) {
    return;
  }

  syncFromStorage();
  memoryCache.set(summary.id, {
    summary,
    cachedAt: Date.now(),
  });
  writeStorage();
}

export function readHistorySessionSummary(sessionId: string | null | undefined) {
  const normalizedSessionId = typeof sessionId === "string" ? sessionId.trim() : "";
  if (!normalizedSessionId) {
    return null;
  }

  syncFromStorage();
  const pruned = pruneEntries(memoryCache);
  memoryCache.clear();
  for (const [entryId, entry] of pruned.entries()) {
    memoryCache.set(entryId, entry);
  }

  return memoryCache.get(normalizedSessionId)?.summary ?? null;
}
