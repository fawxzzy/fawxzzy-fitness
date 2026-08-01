"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { readPendingSetLogs } from "@/lib/offline/set-log-queue";
import { readPendingSkipToggles } from "@/lib/offline/skip-toggle-queue";

type BadgeState = "offline" | "saved-local" | "syncing" | "synced" | "hidden";

const POLL_MS = 1200;
const SYNCED_VISIBLE_MS = 3000;

export function OfflineSyncBadge({
  userId,
  className,
  label,
}: {
  userId: string;
  className?: string;
  label?: string | null;
}) {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [badgeState, setBadgeState] = useState<BadgeState>("hidden");
  const prevHadPendingRef = useRef(false);
  const syncedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const evaluate = async () => {
      try {
        const online = typeof navigator === "undefined" ? true : navigator.onLine;
        setIsOnline(online);

        // Combine both offline queues (set-logs + skip-toggles) into one
        // "you have unsynced changes" signal, mirroring how this badge
        // already aggregates across all pending set-log items rather than
        // showing a separate indicator per source.
        const [pendingItems, pendingSkipItems] = await Promise.all([
          readPendingSetLogs(userId),
          readPendingSkipToggles(userId),
        ]);
        const hasPending = pendingItems.length > 0 || pendingSkipItems.length > 0;
        const hasSyncing = pendingItems.some((item) => item.status === "syncing")
          || pendingSkipItems.some((item) => item.status === "syncing");

        if (!online) {
          setBadgeState("offline");
        } else if (hasSyncing) {
          setBadgeState("syncing");
        } else if (hasPending) {
          setBadgeState("saved-local");
        } else if (prevHadPendingRef.current) {
          setBadgeState("synced");
          if (syncedTimeoutRef.current !== null) {
            window.clearTimeout(syncedTimeoutRef.current);
          }
          syncedTimeoutRef.current = window.setTimeout(() => {
            setBadgeState("hidden");
            syncedTimeoutRef.current = null;
          }, SYNCED_VISIBLE_MS);
        } else {
          setBadgeState("hidden");
        }

        prevHadPendingRef.current = hasPending;
      } catch {
        // Keep badge non-blocking when offline storage is unavailable.
      }
    };

    const intervalId = window.setInterval(() => {
      void evaluate();
    }, POLL_MS);

    const handleOnline = () => {
      setIsOnline(true);
      void evaluate();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setBadgeState("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    void evaluate();

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (syncedTimeoutRef.current !== null) {
        window.clearTimeout(syncedTimeoutRef.current);
      }
    };
  }, [userId]);

  if (badgeState === "hidden" && !label) {
    return null;
  }

  const text =
    label
    ?? (badgeState === "offline"
      ? "Offline"
      : badgeState === "syncing"
        ? "Syncing..."
        : badgeState === "saved-local"
          ? "Saved locally"
          : "All changes synced");

  return (
    <p
      className={cn(
        "inline-flex items-center rounded-full border border-border/70 bg-surface/85 px-2.5 py-1 text-[11px] font-medium text-muted shadow-sm",
        className,
      )}
    >
      {text}
      {!label && !isOnline && badgeState !== "offline" ? " | offline" : ""}
    </p>
  );
}
