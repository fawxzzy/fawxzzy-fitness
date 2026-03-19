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

type BottomActionsContextValue = {
  api: BottomActionsApi;
  published: PublishedBottomActions | null;
};

const BottomActionsContext = createContext<BottomActionsContextValue | null>(null);

export function BottomActionsProvider({ children }: { children: ReactNode }) {
  const [published, setPublished] = useState<PublishedBottomActions | null>(null);

  const api = useMemo<BottomActionsApi>(() => ({
    publish: (registration, node) => {
      setPublished((current) => {
        if (current?.registration === registration && Object.is(current.node, node)) {
          return current;
        }

        return { registration, node };
      });
    },
    unpublish: (registration) => {
      setPublished((current) => (current?.registration === registration ? null : current));
    },
  }), []);

  return <BottomActionsContext.Provider value={{ api, published }}>{children}</BottomActionsContext.Provider>;
}

export function useBottomActions(): BottomActionsApi {
  const context = useContext(BottomActionsContext);
  if (!context) {
    throw new Error("useBottomActions must be used within BottomActionsProvider");
  }
  return context.api;
}

export function useHasBottomActions(): boolean {
  const context = useContext(BottomActionsContext);
  return Boolean(context?.published?.node);
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
  const context = useContext(BottomActionsContext);
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
  }, [context?.published?.node]);

  if (!context || !context.published?.node) {
    return null;
  }

  return (
    <div ref={slotRef}>
      <BottomActionBar variant="sticky">{context.published.node}</BottomActionBar>
    </div>
  );
}
