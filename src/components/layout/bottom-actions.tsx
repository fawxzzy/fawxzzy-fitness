"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";

type BottomActionRegistration = symbol;

type BottomActionsOwner = {
  node: ReactNode | null;
  publishedAt: number;
};

type PublishedBottomActions = {
  registration: BottomActionRegistration;
  node: ReactNode | null;
};

type BottomActionsStore = {
  ownersRef: { current: Map<BottomActionRegistration, BottomActionsOwner> };
  publishedRef: { current: PublishedBottomActions | null };
  publish: (registration: BottomActionRegistration, node: ReactNode | null) => void;
  unpublish: (registration: BottomActionRegistration) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PublishedBottomActions | null;
};

const BottomActionsApiContext = createContext<BottomActionsStore | null>(null);

function getActivePublishedBottomActions(owners: Map<BottomActionRegistration, BottomActionsOwner>): PublishedBottomActions | null {
  let activeRegistration: BottomActionRegistration | null = null;
  let activeOwner: BottomActionsOwner | null = null;

  for (const [registration, owner] of owners) {
    if (!owner.node) {
      continue;
    }

    if (!activeOwner || owner.publishedAt >= activeOwner.publishedAt) {
      activeRegistration = registration;
      activeOwner = owner;
    }
  }

  if (!activeRegistration || !activeOwner?.node) {
    return null;
  }

  return {
    registration: activeRegistration,
    node: activeOwner.node,
  };
}

export function BottomActionsProvider({ children }: { children: ReactNode }) {
  const ownersRef = useRef(new Map<BottomActionRegistration, BottomActionsOwner>());
  const listenersRef = useRef(new Set<() => void>());
  const publishedRef = useRef<PublishedBottomActions | null>(null);
  const publishedCounterRef = useRef(0);

  const store = useMemo<BottomActionsStore>(() => {
    const notify = () => {
      for (const listener of listenersRef.current) {
        listener();
      }
    };

    const syncPublishedSlot = () => {
      const nextPublished = getActivePublishedBottomActions(ownersRef.current);
      const previousPublished = publishedRef.current;

      if (
        previousPublished?.registration === nextPublished?.registration
        && Object.is(previousPublished?.node, nextPublished?.node)
      ) {
        return;
      }

      publishedRef.current = nextPublished;
      notify();
    };

    return {
      ownersRef,
      publishedRef,
      publish: (registration, node) => {
        const currentOwner = ownersRef.current.get(registration);
        if (currentOwner && Object.is(currentOwner.node, node)) {
          return;
        }

        publishedCounterRef.current += 1;
        ownersRef.current.set(registration, {
          node,
          publishedAt: publishedCounterRef.current,
        });
        syncPublishedSlot();
      },
      unpublish: (registration) => {
        if (!ownersRef.current.has(registration)) {
          return;
        }

        ownersRef.current.delete(registration);
        syncPublishedSlot();
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
    <BottomActionsApiContext.Provider value={store}>
      {children}
    </BottomActionsApiContext.Provider>
  );
}

export function useBottomActions(): BottomActionsStore {
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
