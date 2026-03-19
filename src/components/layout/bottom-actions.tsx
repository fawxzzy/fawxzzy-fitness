"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";

type BottomActionRegistration = symbol;

type BottomActionsApi = {
  publish: (registration: BottomActionRegistration, node: ReactNode | null) => void;
  unpublish: (registration: BottomActionRegistration) => void;
};

type PublishedBottomActions = {
  registration: BottomActionRegistration;
  node: ReactNode | null;
};

const BottomActionsApiContext = createContext<BottomActionsApi | null>(null);
const BottomActionsPublishedContext = createContext<PublishedBottomActions | null>(null);

export function BottomActionsProvider({ children }: { children: ReactNode }) {
  const publishedRef = useRef<PublishedBottomActions | null>(null);
  const [published, setPublished] = useState<PublishedBottomActions | null>(null);

  const api = useMemo<BottomActionsApi>(() => ({
    publish: (registration, node) => {
      const current = publishedRef.current;
      if (current?.registration === registration && Object.is(current.node, node)) {
        return;
      }

      const next = { registration, node };
      publishedRef.current = next;
      setPublished((state) => {
        if (state?.registration === registration && Object.is(state.node, node)) {
          return state;
        }
        return next;
      });
    },
    unpublish: (registration) => {
      if (publishedRef.current?.registration !== registration) {
        return;
      }

      publishedRef.current = null;
      setPublished((state) => (state?.registration === registration ? null : state));
    },
  }), []);

  return (
    <BottomActionsApiContext.Provider value={api}>
      <BottomActionsPublishedContext.Provider value={published}>{children}</BottomActionsPublishedContext.Provider>
    </BottomActionsApiContext.Provider>
  );
}

export function useBottomActions(): BottomActionsApi {
  const context = useContext(BottomActionsApiContext);
  if (!context) {
    throw new Error("useBottomActions must be used within BottomActionsProvider");
  }
  return context;
}

export function useHasBottomActions(): boolean {
  return Boolean(useContext(BottomActionsPublishedContext)?.node);
}

export function usePublishBottomActions(node: ReactNode | null) {
  const { publish, unpublish } = useBottomActions();
  const registrationRef = useRef<BottomActionRegistration>();

  if (!registrationRef.current) {
    registrationRef.current = Symbol("bottom-actions-registration");
  }

  const registration = registrationRef.current;

  useLayoutEffect(() => {
    publish(registration, node);
  }, [node, publish, registration]);

  useLayoutEffect(() => {
    return () => {
      unpublish(registration);
    };
  }, [registration, unpublish]);
}

export function BottomActionsSlot() {
  const published = useContext(BottomActionsPublishedContext);
  const slotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const slotElement = slotRef.current;
    if (!slotElement) {
      return;
    }

    let current: HTMLElement | null = slotElement.parentElement;
    let hasScrollableAncestor = false;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      if (overflowY === "auto" || overflowY === "scroll") {
        hasScrollableAncestor = true;
        break;
      }
      current = current.parentElement;
    }

    if (!hasScrollableAncestor) {
      console.warn("[bottom-actions] BottomActionsSlot should be rendered inside a scroll owner (overflow-y-auto/scroll ancestor not found).");
    }
  }, [published?.node]);

  if (!published?.node) {
    return null;
  }

  return (
    <div ref={slotRef}>
      <BottomActionBar variant="sticky">{published.node}</BottomActionBar>
    </div>
  );
}
