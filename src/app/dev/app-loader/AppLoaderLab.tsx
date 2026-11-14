"use client";

import { useEffect, useState } from "react";
import { RouteLoading } from "@/components/RouteLoading";

const CLIENT_WAITS_MS = [60, 140, 300, 1500] as const;

/**
 * Dev-only: mounts a <RouteLoading> for a fixed time, with no server or network involved, so the loader timeline
 * can be measured without request noise (a 60 ms wait must never show it; a 300 ms wait shows it and holds).
 */
export function AppLoaderLab() {
  const [waitMs, setWaitMs] = useState<number | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (waitMs === null) {
      return;
    }
    const timer = window.setTimeout(() => setWaitMs(null), waitMs);
    return () => window.clearTimeout(timer);
  }, [waitMs]);

  return (
    <>
      <ul className="mt-4 grid gap-3">
        {CLIENT_WAITS_MS.map((ms) => (
          <li key={ms}>
            <button
              type="button"
              data-testid={`client-wait-${ms}`}
              onClick={() => setWaitMs(ms)}
              className="block w-full rounded-xl border border-[rgb(var(--stroke-soft)/0.4)] px-4 py-3 text-left"
            >
              Client wait {ms} ms
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-testid="client-wait-stuck"
        onClick={() => setStuck((current) => !current)}
        className="mt-3 block w-full rounded-xl border border-[rgb(var(--stroke-soft)/0.4)] px-4 py-3 text-left"
      >
        {stuck ? "Release the never-resolving wait" : "Start a never-resolving wait"}
      </button>
      {stuck ? <RouteLoading label="Fixture stuck wait" variant="route" /> : null}
      {waitMs !== null ? <RouteLoading label="Fixture wait" variant="route" /> : null}
    </>
  );
}
