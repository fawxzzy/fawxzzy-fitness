"use client";

import { useEffect } from "react";
import { writeHistoryCache, type HistoryCacheSnapshot } from "@/lib/offline/history-cache";

export function HistoryOfflineBridge({ snapshot }: { snapshot: HistoryCacheSnapshot | null }) {
  useEffect(() => {
    if (!snapshot) {
      return;
    }

    void writeHistoryCache(snapshot);
  }, [snapshot]);

  return null;
}
