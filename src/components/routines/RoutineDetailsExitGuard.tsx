"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useBackNavigation } from "@/components/ui/useBackNavigation";

type RoutineDetailsExitGuardContextValue = {
  hasUnsavedChanges: boolean;
  isConfirmingDiscard: boolean;
  headerTitle: ReactNode;
  setHasUnsavedChanges: (nextValue: boolean) => void;
  setHeaderTitle: (nextValue: ReactNode) => void;
  requestExit: () => void;
  stayOnScreen: () => void;
  discardChanges: () => void;
};

const RoutineDetailsExitGuardContext = createContext<RoutineDetailsExitGuardContextValue | null>(null);

export function RoutineDetailsScreenShellClient({
  children,
  backHref,
  title = "Routine Details",
  subtitle,
  align = "left",
}: {
  children: ReactNode;
  backHref: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
}) {
  const { navigateBack } = useBackNavigation({ fallbackHref: backHref, historyBehavior: "fallback-only" });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isConfirmingDiscard, setIsConfirmingDiscard] = useState(false);
  const [headerTitle, setHeaderTitle] = useState<ReactNode>(title);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      setIsConfirmingDiscard(false);
    }
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setHeaderTitle(title);
  }, [title]);

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
    headerTitle,
    setHasUnsavedChanges,
    setHeaderTitle,
    requestExit,
    stayOnScreen,
    discardChanges,
  }), [discardChanges, hasUnsavedChanges, headerTitle, isConfirmingDiscard, requestExit, stayOnScreen]);

  return (
    <RoutineDetailsExitGuardContext.Provider value={contextValue}>
      <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="editDay">
        <ScrollScreenWithBottomActions
          floatingHeader={(
            <div className="px-1">
              <SharedScreenHeader
                recipe="editDay"
                title={headerTitle}
                subtitle={subtitle}
                align={align}
                action={(
                  <TopRightBackButton
                    href={backHref}
                    historyBehavior="fallback-only"
                    onClick={(event) => {
                      event.preventDefault();
                      requestExit();
                    }}
                  />
                )}
              />
            </div>
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

export function useRoutineDetailsDirtyState(hasUnsavedChanges: boolean) {
  const { setHasUnsavedChanges } = useRoutineDetailsExitGuard();

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);
}

export function useRoutineDetailsHeaderTitle(title: ReactNode) {
  const { setHeaderTitle } = useRoutineDetailsExitGuard();

  useEffect(() => {
    setHeaderTitle(title);
  }, [setHeaderTitle, title]);
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
