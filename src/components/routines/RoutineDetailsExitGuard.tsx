"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { OverlayHeaderBlock, overlayChromeClassNames } from "@/components/ui/OverlayChrome";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { useBackNavigation } from "@/components/ui/useBackNavigation";
import { cn } from "@/lib/cn";

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
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stayOnScreen();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [stayOnScreen]);

  useEffect(() => {
    const focusable = modalRef.current?.querySelector<HTMLElement>("button:not([disabled])");
    focusable?.focus();
  }, []);

  return (
    <>
      <PublishBottomActions>
        <BottomActionSplit
          secondary={(
            <BottomDockButton type="button" intent="danger" onClick={stayOnScreen}>
              Cancel
            </BottomDockButton>
          )}
          primary={(
            <BottomDockButton
              type="button"
              intent="danger"
              className="!border-transparent !bg-[rgb(var(--danger-rgb))] !text-white"
              onClick={discardChanges}
            >
              Discard
            </BottomDockButton>
          )}
        />
      </PublishBottomActions>
      {createPortal(
        <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 pb-[calc(var(--app-mobile-bottom-dock-height,92px)+1rem+max(0rem,var(--app-safe-bottom)))] pt-[max(1rem,var(--app-safe-top))]">
          <button
            type="button"
            aria-label="Close confirmation"
            className={cn(
              "fixed inset-x-0 top-0 bottom-[var(--app-mobile-bottom-dock-height,92px)] z-0 bg-[rgba(3,8,14,0.72)] backdrop-blur-[6px]",
            )}
            onClick={stayOnScreen}
          />
          <div
            ref={modalRef}
            className={cn(
              overlayChromeClassNames.panelBase,
              "w-full max-w-[22rem] rounded-[var(--radius-lg)] px-4 py-4",
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <OverlayHeaderBlock
              title="Discard changes?"
              titleId={titleId}
              className="px-0 pb-0"
              titleClassName="text-center"
            />
          </div>
        </div>,
        document.body,
      )}
    </>
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
