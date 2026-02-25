"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Glass } from "@/components/ui/Glass";
import { GlassButton } from "@/components/ui/GlassButton";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";

type Props = {
  href: string;
  hasUnsavedChanges?: boolean;
};

export function RoutineBackButton({ href, hasUnsavedChanges = true }: Props) {
  const router = useRouter();
  const [showDiscardModal, setShowDiscardModal] = useState(false);

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

      {showDiscardModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <Glass variant="overlay" className="w-full max-w-sm p-4" interactive={false}>
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-text">Discard changes?</h2>
              <p className="text-sm text-muted">You have unsaved routine edits. Leave this page without saving?</p>
              <div className="flex justify-end gap-2">
                <GlassButton className="min-w-20" onClick={() => setShowDiscardModal(false)}>
                  Stay
                </GlassButton>
                <GlassButton
                  className="min-w-20 border-red-300/70 bg-red-500/30 text-white hover:bg-red-500/45"
                  onClick={() => {
                    setShowDiscardModal(false);
                    router.push(href);
                  }}
                >
                  Discard
                </GlassButton>
              </div>
            </div>
          </Glass>
        </div>
      ) : null}
    </>
  );
}
