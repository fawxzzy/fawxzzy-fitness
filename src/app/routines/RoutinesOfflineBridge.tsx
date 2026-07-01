"use client";

import { useEffect } from "react";
import { writeRoutinesCache, type RoutinesCacheSnapshot } from "@/lib/offline/routines-cache";

export function RoutinesOfflineBridge({ snapshot }: { snapshot: RoutinesCacheSnapshot | null }) {
  useEffect(() => {
    if (!snapshot) {
      return;
    }

    void writeRoutinesCache(snapshot);
  }, [snapshot]);

  return null;
}
