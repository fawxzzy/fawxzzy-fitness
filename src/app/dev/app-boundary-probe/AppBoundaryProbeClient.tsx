"use client";

import { useEffect, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export function AppBoundaryProbeClient({
  autoCrash = false,
}: {
  autoCrash?: boolean;
}) {
  const [shouldCrash, setShouldCrash] = useState(false);

  useEffect(() => {
    if (autoCrash) {
      setShouldCrash(true);
    }
  }, [autoCrash]);

  if (shouldCrash) {
    throw new Error("App boundary probe crash");
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-4">
      <SurfaceCard className="w-full max-w-[28rem]">
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-divider-rgb)/0.92)]">
            App Boundary Probe
          </p>
          <h1 className="text-[1rem] font-semibold leading-[1.2] text-[rgb(var(--text-primary)/0.96)]">
            Trigger a client crash to verify the soft boundary.
          </h1>
          <p className="text-[0.88rem] leading-[1.45] text-[rgb(var(--text-secondary)/0.94)]">
            This route intentionally throws after hydration when crash mode is enabled.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShouldCrash(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--accent)/0.92)] px-4 text-[0.84rem] font-semibold text-white transition hover:bg-[rgb(var(--accent)/1)]"
          >
            Trigger Crash
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}
