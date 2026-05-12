"use client";

import { useEffect } from "react";
import {
  publishLoadingDiagnostics,
  type LoadingDiagnosticEntry,
} from "@/lib/loading-diagnostics";

export function LoadingDiagnosticsClientBridge({
  entries,
}: {
  entries: LoadingDiagnosticEntry[];
}) {
  useEffect(() => {
    publishLoadingDiagnostics(entries);
  }, [entries]);

  return null;
}
