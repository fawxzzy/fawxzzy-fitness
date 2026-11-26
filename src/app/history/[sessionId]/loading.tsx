"use client";

import { RouteLoading } from "@/components/RouteLoading";

export default function HistoryDetailLoading() {
  return (
    <RouteLoading
      label="Loading workout…"
      detail="Preparing your logged workout."
      gateName="route.history-detail"
      blockingReason="Waiting for the logged session detail route to render."
    />
  );
}
