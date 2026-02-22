"use client";

import { useEffect } from "react";
import { writeTodayCache, type TodayCacheSnapshot } from "@/lib/offline/today-cache";

export function TodayOfflineBridge({ snapshot }: { snapshot: TodayCacheSnapshot | null }) {
  useEffect(() => {
    if (!snapshot) {
      return;
    }

    void writeTodayCache(snapshot);
  }, [snapshot]);

  return null;
}
