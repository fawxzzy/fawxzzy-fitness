"use client";

import { useEffect } from "react";
import { writeSessionCache, type SessionCacheSnapshot } from "@/lib/offline/session-cache";

export function SessionOfflineBridge({ snapshot }: { snapshot: SessionCacheSnapshot | null }) {
  useEffect(() => {
    if (!snapshot) {
      return;
    }

    void writeSessionCache(snapshot);
  }, [snapshot]);

  return null;
}
