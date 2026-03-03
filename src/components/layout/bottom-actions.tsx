"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BottomActionBar } from "@/components/ui/BottomActionBar";

type BottomActionsApi = {
  set: (node: React.ReactNode | null) => void;
};

type BottomActionsContextValue = {
  api: BottomActionsApi;
  node: React.ReactNode | null;
};

const BottomActionsContext = createContext<BottomActionsContextValue | null>(null);

export function BottomActionsProvider({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<React.ReactNode | null>(null);
  const api = useMemo<BottomActionsApi>(() => ({ set: setNode }), []);

  return <BottomActionsContext.Provider value={{ api, node }}>{children}</BottomActionsContext.Provider>;
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
  return Boolean(context?.node);
}

export function usePublishBottomActions(node: React.ReactNode | null) {
  const { set } = useBottomActions();

  useEffect(() => {
    set(node);
    return () => set(null);
  }, [node, set]);
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
  }, [context?.node]);

  if (!context || !context.node) {
    return null;
  }

  return (
    <div ref={slotRef}>
      <BottomActionBar variant="sticky">{context.node}</BottomActionBar>
    </div>
  );
}
