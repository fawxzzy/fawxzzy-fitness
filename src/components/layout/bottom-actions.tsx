"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";

type BottomActionRegistration = symbol;

type BottomActionsApi = {
  publish: (registration: BottomActionRegistration, node: ReactNode | null) => void;
  unpublish: (registration: BottomActionRegistration) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PublishedBottomActions | null;
};

export type PublishedBottomActions = {
  registration: BottomActionRegistration;
  node: ReactNode | null;
};

const BottomActionsApiContext = createContext<BottomActionsApi | null>(null);

export function BottomActionsProvider({ children }: { children: ReactNode }) {
  const publishedRef = useRef<PublishedBottomActions | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  const api = useMemo<BottomActionsApi>(() => {
    const notify = () => {
      for (const listener of listenersRef.current) {
        listener();
      }
    };

    return {
      publish: (registration, node) => {
        const current = publishedRef.current;
        if (current?.registration === registration && Object.is(current.node, node)) {
          return;
        }

        publishedRef.current = { registration, node };
        notify();
      },
      unpublish: (registration) => {
        if (publishedRef.current?.registration !== registration) {
          return;
        }

        publishedRef.current = null;
        notify();
      },
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => {
          listenersRef.current.delete(listener);
        };
      },
      getSnapshot: () => publishedRef.current,
    };
  }, []);

  return (
    <BottomActionsApiContext.Provider value={api}>
      {children}
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

export function usePublishedBottomActions(): PublishedBottomActions | null {
  const { subscribe, getSnapshot } = useBottomActions();
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useHasBottomActions(): boolean {
  return Boolean(usePublishedBottomActions()?.node);
}

export function usePublishBottomActions(node: ReactNode | null) {
  const { publish, unpublish } = useBottomActions();
  const registrationRef = useRef<BottomActionRegistration>();
  const lastPublishedNodeRef = useRef<ReactNode | null | typeof UNPUBLISHED>(UNPUBLISHED);

  if (!registrationRef.current) {
    registrationRef.current = Symbol("bottom-actions-registration");
  }

  const registration = registrationRef.current;

  useLayoutEffect(() => {
    if (lastPublishedNodeRef.current !== UNPUBLISHED && Object.is(lastPublishedNodeRef.current, node)) {
      return;
    }

    lastPublishedNodeRef.current = node;
    publish(registration, node);
  }, [node, publish, registration]);

  useLayoutEffect(() => () => {
    lastPublishedNodeRef.current = UNPUBLISHED;
    unpublish(registration);
  }, [registration, unpublish]);
}

const UNPUBLISHED = Symbol("bottom-actions-unpublished");

export function BottomActionsSlot() {
  const published = usePublishedBottomActions();
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
