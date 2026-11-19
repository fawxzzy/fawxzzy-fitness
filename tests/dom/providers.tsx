// Shared providers for DOM interaction tests: a recording App Router, pathname, search params and the toast host.
// Nothing here talks to the network or to Supabase; handlers a test cares about are passed in as spies.
import type { ReactNode } from "react";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime.js";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime.js";
import { ToastProvider } from "../../src/components/ui/ToastProvider.tsx";

export type RouterCalls = { push: string[]; replace: string[]; refresh: number; back: number; prefetch: string[] };

export function createRouterSpy() {
  const calls: RouterCalls = { push: [], replace: [], refresh: 0, back: 0, prefetch: [] };
  const router = {
    push(href: string) {
      calls.push.push(href);
    },
    replace(href: string) {
      calls.replace.push(href);
    },
    refresh() {
      calls.refresh += 1;
    },
    back() {
      calls.back += 1;
    },
    forward() {},
    prefetch(href: string) {
      calls.prefetch.push(href);
    },
  };
  return { router, calls };
}

export function AppProviders({
  router,
  pathname = "/today",
  search = "",
  children,
}: {
  router: ReturnType<typeof createRouterSpy>["router"];
  pathname?: string;
  search?: string;
  children: ReactNode;
}) {
  return (
    <AppRouterContext.Provider value={router}>
      <PathnameContext.Provider value={pathname}>
        <SearchParamsContext.Provider value={new URLSearchParams(search)}>
          <ToastProvider>{children}</ToastProvider>
        </SearchParamsContext.Provider>
      </PathnameContext.Provider>
    </AppRouterContext.Provider>
  );
}
