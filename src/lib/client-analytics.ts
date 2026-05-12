"use client";

type AnalyticsValue = string | number | boolean | null;
type AnalyticsPayload = Record<string, AnalyticsValue | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, AnalyticsValue>>;
  }
}

const ANALYTICS_SESSION_PREFIX = "fawxzzy:analytics";
const inMemoryDeduplicationKeys = new Set<string>();

function normalizePayload(payload: AnalyticsPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Record<string, AnalyticsValue>;
}

function buildDeduplicationKey(event: string, payload: Record<string, AnalyticsValue>) {
  return `${event}:${JSON.stringify(
    Object.keys(payload)
      .sort()
      .map((key) => [key, payload[key]]),
  )}`;
}

function hasTrackedKey(key: string) {
  if (inMemoryDeduplicationKeys.has(key)) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.sessionStorage.getItem(`${ANALYTICS_SESSION_PREFIX}:${key}`) === "1";
  } catch {
    return false;
  }
}

function markTrackedKey(key: string) {
  inMemoryDeduplicationKeys.add(key);

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(`${ANALYTICS_SESSION_PREFIX}:${key}`, "1");
  } catch {
    // Ignore sessionStorage failures and fall back to in-memory deduplication.
  }
}

export function trackClientEvent(
  event: string,
  payload: AnalyticsPayload,
  options?: {
    dedupeKey?: string;
  },
) {
  if (typeof window === "undefined") {
    return false;
  }

  const normalizedPayload = normalizePayload(payload);
  const dedupeKey = options?.dedupeKey ?? buildDeduplicationKey(event, normalizedPayload);

  if (hasTrackedKey(dedupeKey)) {
    return false;
  }

  markTrackedKey(dedupeKey);

  const eventRecord = {
    event,
    ...normalizedPayload,
  };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventRecord);
  }

  window.dispatchEvent(
    new CustomEvent("app-analytics", {
      detail: eventRecord,
    }),
  );

  if (process.env.NODE_ENV !== "production") {
    console.info("[analytics]", event, normalizedPayload);
  }

  return true;
}
