"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

export function usePublishBottomActions(node: React.ReactNode | null) {
  const { set } = useBottomActions();

  useEffect(() => {
    set(node);
    return () => set(null);
  }, [node, set]);
}

export function BottomActionsSlot() {
  const context = useContext(BottomActionsContext);
  if (!context || !context.node) {
    return null;
  }

  return <BottomActionBar variant="sticky">{context.node}</BottomActionBar>;
}
