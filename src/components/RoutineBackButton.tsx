"use client";

import { useState } from "react";
import { RoutineEditorSaveDiscardConfirmSheet } from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { useBackNavigation } from "@/components/ui/useBackNavigation";

type Props = {
  href: string;
  hasUnsavedChanges?: boolean;
};

export function RoutineBackButton({ href, hasUnsavedChanges = true }: Props) {
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const { navigateBack } = useBackNavigation({ fallbackHref: href, historyBehavior: "history-first" });

  return (
    <>
      <TopRightBackButton
        href={href}
        onClick={(event) => {
          if (!hasUnsavedChanges) return;
          event.preventDefault();
          setShowDiscardModal(true);
        }}
      />

      <RoutineEditorSaveDiscardConfirmSheet
        open={showDiscardModal}
        description="You have unsaved routine edits. Leave this page without saving?"
        onStay={() => setShowDiscardModal(false)}
        onDiscard={() => {
          setShowDiscardModal(false);
          navigateBack();
        }}
      />
    </>
  );
}
