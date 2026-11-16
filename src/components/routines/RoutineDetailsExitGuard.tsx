"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useBackNavigation } from "@/components/ui/useBackNavigation";

type RoutineDetailsExitGuardContextValue = {
  hasUnsavedChanges: boolean;
  isConfirmingDiscard: boolean;
  setHasUnsavedChanges: (nextValue: boolean) => void;
  requestExit: () => void;
  stayOnScreen: () => void;
  discardChanges: () => void;
};

const RoutineDetailsExitGuardContext = createContext<RoutineDetailsExitGuardContextValue | null>(null);

// Create routine / edit routine shell: one ScreenHeader (kind="detail", Back on the left). Back goes through the
// unsaved-changes guard. The routine name is a body field, never an input inside the header (DESIGN-CONTRACT 15).
export function RoutineDetailsScreenShellClient({
  children,
  backHref,
  title = "Routine",
  subtitle,
}: {
  children: ReactNode;
  backHref: string;
  title?: string;
  subtitle?: string | null;
}) {
  const { navigateBack } = useBackNavigation({ fallbackHref: backHref, historyBehavior: "fallback-only" });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setIsConfirmingDiscard(false);
    }
  }, [hasUnsavedChanges]);

  const requestExit = useCallback(() => {
    if (!hasUnsavedChanges) {
      navigateBack();
      return;
    }

    setIsConfirmingDiscard(true);
  }, [hasUnsavedChanges, navigateBack]);

  const stayOnScreen = useCallback(() => {
    setIsConfirmingDiscard(false);
  }, []);

  const discardChanges = useCallback(() => {
    setIsConfirmingDiscard(false);
    navigateBack();
  }, [navigateBack]);

  const contextValue = useMemo<RoutineDetailsExitGuardContextValue>(() => ({
    hasUnsavedChanges,
    isConfirmingDiscard,
    setHasUnsavedChanges,
    requestExit,
    stayOnScreen,
    discardChanges,
  }), [discardChanges, hasUnsavedChanges, isConfirmingDiscard, requestExit, stayOnScreen]);

  return (
    <RoutineDetailsExitGuardContext.Provider value={contextValue}>
      <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="editDay">
        <ScrollScreenWithBottomActions
          floatingHeader={(
            <ScreenHeader
              kind="detail"
              title={title}
              subtitle={subtitle}
              back={(
                <ScreenHeaderBackButton
                  href={backHref}
                  onClick={(event) => {
                    event.preventDefault();
                    requestExit();
                  }}
                />
              )}
            />
          )}
        >
          {children}
        </ScrollScreenWithBottomActions>
      </AppShell>
    </RoutineDetailsExitGuardContext.Provider>
  );
}

export function useRoutineDetailsExitGuard() {
  const context = useContext(RoutineDetailsExitGuardContext);
  if (!context) {
    throw new Error("useRoutineDetailsExitGuard must be used within RoutineDetailsScreenShellClient");
  }

  return context;
}

export function useOptionalRoutineDetailsExitGuard() {
  return useContext(RoutineDetailsExitGuardContext);
}

export function useRoutineDetailsDirtyState(hasUnsavedChanges: boolean) {
  const { setHasUnsavedChanges } = useRoutineDetailsExitGuard();

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);
}

export function RoutineDetailsDiscardConfirmationDock() {
  const { stayOnScreen, discardChanges } = useRoutineDetailsExitGuard();

  return (
    <ConfirmDestructiveModal
      open
      title="Discard changes?"
      confirmLabel="Discard"
      onCancel={stayOnScreen}
      onConfirm={discardChanges}
    />
  );
}

export function RoutineDetailsBackSecondaryAction({ label = "Back", intent = "info" }: { label?: string; intent?: "info" | "danger" }) {
  const { requestExit } = useRoutineDetailsExitGuard();

  return (
    <BottomDockButton type="button" intent={intent} onClick={requestExit}>
      {label}
    </BottomDockButton>
  );
}
