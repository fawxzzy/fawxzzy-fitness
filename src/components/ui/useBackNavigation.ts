"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSafeReturnContract, isSafeAppPath } from "@/lib/navigation-return";

const STORAGE_KEY = "fawxzzy:in-app-history";
const STACK_LIMIT = 50;

export function readStack() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => isSafeAppPath(entry)) : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack.slice(-STACK_LIMIT)));
}

function getNavigationType() {
  if (typeof window === "undefined" || typeof window.performance === "undefined") {
    return null;
  }

  const navigationEntry = window.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return navigationEntry?.type ?? null;
}

export function getPreviousInAppPath(currentPath: string): string | null {
  return getSafeReturnContract(currentPath, readStack()).historyHref;
}

export function getSafeReturnHref(currentPath: string, fallbackHref?: string): string | null {
  return getSafeReturnContract(currentPath, readStack(), fallbackHref).returnHref;
}

export function shouldUseHistoryBack(currentPath: string, fallbackHref?: string): boolean {
  return getSafeReturnContract(currentPath, readStack(), fallbackHref).useHistoryBack;
}

export function useBackNavigation({
  fallbackHref,
  historyBehavior = "history-first",
}: {
  fallbackHref?: string;
  historyBehavior?: "history-first" | "fallback-only";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = useMemo(() => {
    const search = searchParams?.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isSafeAppPath(currentPath)) {
      return;
    }

    if (getNavigationType() === "reload") {
      writeStack([currentPath]);
      return;
    }

    const stack = readStack();
    const lastEntry = stack[stack.length - 1];
    const previousEntry = stack[stack.length - 2];

    if (lastEntry === currentPath) {
      return;
    }

    if (previousEntry === currentPath) {
      writeStack(stack.slice(0, -1));
      return;
    }

    writeStack([...stack, currentPath]);
  }, [currentPath]);

  const canGoBack = useMemo(() => {
    if (historyBehavior !== "history-first") {
      return false;
    }

    return shouldUseHistoryBack(currentPath, fallbackHref);
  }, [currentPath, fallbackHref, historyBehavior]);

  const navigateBack = useCallback(() => {
    if (historyBehavior === "history-first" && shouldUseHistoryBack(currentPath, fallbackHref)) {
      router.back();
      return true;
    }

    const fallbackReturnHref = getSafeReturnContract(currentPath, readStack(), fallbackHref).fallbackReturnHref;
    if (fallbackReturnHref) {
      router.push(fallbackReturnHref);
      return false;
    }

    return false;
  }, [currentPath, fallbackHref, historyBehavior, router]);

  return {
    canGoBack,
    navigateBack,
  };
}
