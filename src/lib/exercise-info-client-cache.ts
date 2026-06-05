"use client";

import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";

type ExerciseInfoClientPayload = {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
};

type ExerciseInfoClientCacheEntry = {
  payload: ExerciseInfoClientPayload;
  cachedAt: number;
  source: "seed" | "server";
};

const STORAGE_KEY = "fawxzzy:exercise-info-cache:v1";
const MAX_ENTRIES = 36;
const SERVER_TTL_MS = 5 * 60 * 1000;
const SEED_TTL_MS = 45 * 1000;
const memoryCache = new Map<string, ExerciseInfoClientCacheEntry>();

function canUseBrowser() {
  return typeof window !== "undefined";
}

function normalizeExerciseId(exerciseId: string | null | undefined) {
  return typeof exerciseId === "string" ? exerciseId.trim() : "";
}

function getFreshnessTtl(entry: ExerciseInfoClientCacheEntry) {
  return entry.source === "server" ? SERVER_TTL_MS : SEED_TTL_MS;
}

function pruneEntries(entries: Map<string, ExerciseInfoClientCacheEntry>) {
  const now = Date.now();
  const freshEntries = [...entries.entries()]
    .filter(([, entry]) => now - entry.cachedAt <= getFreshnessTtl(entry))
    .sort((left, right) => right[1].cachedAt - left[1].cachedAt)
    .slice(0, MAX_ENTRIES);

  return new Map(freshEntries);
}

function readStorageEntries() {
  if (!canUseBrowser()) {
    return new Map<string, ExerciseInfoClientCacheEntry>();
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Map<string, ExerciseInfoClientCacheEntry>();
    }

    const parsed = JSON.parse(raw) as Array<[string, ExerciseInfoClientCacheEntry]>;
    if (!Array.isArray(parsed)) {
      return new Map<string, ExerciseInfoClientCacheEntry>();
    }

    return pruneEntries(new Map(parsed));
  } catch {
    return new Map<string, ExerciseInfoClientCacheEntry>();
  }
}

function writeStorageEntries(entries: Map<string, ExerciseInfoClientCacheEntry>) {
  if (!canUseBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...pruneEntries(entries).entries()]));
  } catch {
    // Ignore sessionStorage failures and keep the in-memory cache alive.
  }
}

function mergeStoredEntries() {
  const stored = readStorageEntries();
  for (const [exerciseId, entry] of stored.entries()) {
    const current = memoryCache.get(exerciseId);
    if (!current || current.cachedAt < entry.cachedAt) {
      memoryCache.set(exerciseId, entry);
    }
  }
}

export function readExerciseInfoClientPayload(exerciseId: string | null | undefined) {
  const normalizedExerciseId = normalizeExerciseId(exerciseId);
  if (!normalizedExerciseId) {
    return null;
  }

  mergeStoredEntries();
  const pruned = pruneEntries(memoryCache);
  memoryCache.clear();
  for (const [entryId, entry] of pruned.entries()) {
    memoryCache.set(entryId, entry);
  }

  return memoryCache.get(normalizedExerciseId) ?? null;
}

export function writeExerciseInfoClientPayload(
  exerciseId: string | null | undefined,
  payload: ExerciseInfoClientPayload,
  source: "seed" | "server",
) {
  const normalizedExerciseId = normalizeExerciseId(exerciseId);
  if (!normalizedExerciseId) {
    return null;
  }

  const current = readExerciseInfoClientPayload(normalizedExerciseId);
  if (
    current
    && current.source === "server"
    && source === "seed"
  ) {
    return current;
  }

  const nextEntry: ExerciseInfoClientCacheEntry = {
    payload,
    cachedAt: Date.now(),
    source,
  };

  memoryCache.set(normalizedExerciseId, nextEntry);
  writeStorageEntries(memoryCache);
  return nextEntry;
}

export function shouldFetchExerciseInfoClientPayload(entry: ExerciseInfoClientCacheEntry | null) {
  if (!entry) {
    return true;
  }

  const ageMs = Date.now() - entry.cachedAt;
  if (ageMs > getFreshnessTtl(entry)) {
    return true;
  }

  return entry.source === "seed";
}
