"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STORAGE_KEY = "fawxzzy:in-app-history";
const STACK_LIMIT = 50;

function isSafeAppPath(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function readStack() {
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

    const stack = readStack();
    return stack.length >= 2 && stack[stack.length - 1] === currentPath && isSafeAppPath(stack[stack.length - 2]);
  }, [currentPath, historyBehavior]);

  const navigateBack = useCallback(() => {
    if (historyBehavior === "history-first") {
      const stack = readStack();
      const previousEntry = stack[stack.length - 2];
      const isCurrentStackTail = stack[stack.length - 1] === currentPath;

      if (isCurrentStackTail && isSafeAppPath(previousEntry)) {
        router.back();
        return true;
      }
    }

    if (isSafeAppPath(fallbackHref)) {
      router.push(fallbackHref);
      return false;
    }

    return false;
  }, [currentPath, fallbackHref, historyBehavior, router]);

  return {
    canGoBack,
    navigateBack,
  };
}
