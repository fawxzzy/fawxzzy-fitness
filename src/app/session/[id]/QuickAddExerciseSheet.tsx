"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { RoutineEditorAddExerciseFlowShell, RoutineEditorInlineSection, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

export function QuickAddExerciseSheet({
  sessionId,
  exercises,
  quickAddExerciseAction,
}: {
  sessionId: string;
  exercises: EditorExerciseOption[];
  quickAddExerciseAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [setCountByExerciseId, setSetCountByExerciseId] = useState<Record<string, number>>({});
  const [pickerInstance, setPickerInstance] = useState(0);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const selectedSetCount = setCountByExerciseId[selectedExerciseId] ?? 3;

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedExerciseId("");
      setPickerInstance((value) => value + 1);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedExerciseId) {
      toast.error("Select an exercise first.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("exerciseId", selectedExerciseId);
      formData.set("setCount", String(selectedSetCount));
      const result = await quickAddExerciseAction(formData);
      toastActionResult(toast, result, {
        success: "Exercise added to session.",
        error: "Could not add exercise.",
      });

      if (result.ok) {
        setOpen(false);
        setSelectedExerciseId("");
        setPickerInstance((value) => value + 1);
        router.refresh();
      }
    });
  }, [quickAddExerciseAction, router, selectedExerciseId, selectedSetCount, sessionId, toast]);

  return (
    <>
      <AppButton type="button" variant="secondary" size="md" fullWidth onClick={() => setOpen(true)}>
        Quick Add Exercise
      </AppButton>
      <BottomSheet
        open={open}
        onClose={() => handleOpenChange(false)}
        title="Add Exercise"
        description="Select an exercise and add it to your current session with starter sets."
        className="max-w-md"
        contentClassName="space-y-5"
      >
        <RoutineEditorAddExerciseFlowShell
          key={pickerInstance}
          exercises={exercises}
          name="exerciseId"
          initialSelectedId={exercises[0]?.id}
          onSelectedExerciseChange={(exercise) => setSelectedExerciseId(exercise?.id ?? "")}
          renderFooter={({ selectedExercise }) => {
            const activeExerciseId = selectedExercise?.id ?? "";
            const activeSetCount = setCountByExerciseId[activeExerciseId] ?? 3;

            return (
              <div className="space-y-3">
                <RoutineEditorInlineSection
                  title="Session setup"
                  description="Choose starter sets for the selected exercise."
                  badge="Volume"
                >
                  <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-border/35 bg-[rgb(var(--bg)/0.14)] px-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-text">
                        {selectedExercise ? `${activeSetCount} set${activeSetCount === 1 ? "" : "s"} to start` : "Choose an exercise first"}
                      </p>
                      <p className="text-xs text-muted">Quick Add applies the selected exercise directly to your current session.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!activeExerciseId}
                      onClick={() => {
                        if (!activeExerciseId) return;
                        setSetCountByExerciseId((current) => ({
                          ...current,
                          [activeExerciseId]: Math.max(1, (current[activeExerciseId] ?? 3) - 1),
                        }));
                      }}
                    >
                      -
                    </AppButton>
                    <input
                      type="number"
                      min={1}
                      value={activeSetCount}
                      disabled={!activeExerciseId}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        if (!activeExerciseId) return;
                        setSetCountByExerciseId((current) => ({
                          ...current,
                          [activeExerciseId]: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                        }));
                      }}
                      className="min-h-11 w-24 rounded-[1rem] border border-border/50 bg-[rgb(var(--surface-2-soft)/0.82)] px-3 py-2.5 text-center text-sm text-text disabled:opacity-60"
                    />
                    <AppButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!activeExerciseId}
                      onClick={() => {
                        if (!activeExerciseId) return;
                        setSetCountByExerciseId((current) => ({
                          ...current,
                          [activeExerciseId]: (current[activeExerciseId] ?? 3) + 1,
                        }));
                      }}
                    >
                      +
                    </AppButton>
                  </div>
                </RoutineEditorInlineSection>

                <div className="sticky bottom-0 -mx-4 bg-[rgb(var(--surface-rgb)/0.985)] px-4 pb-[max(0.25rem,var(--app-safe-bottom))] pt-3">
                  <BottomActionSingle className="border-white/10 bg-[rgb(var(--surface-rgb)/0.985)]">
                    <AppButton type="button" variant="primary" fullWidth loading={isPending} onClick={handleSubmit}>
                      Add Exercise To Session
                    </AppButton>
                  </BottomActionSingle>
                </div>
              </div>
            );
          }}
        />
      </BottomSheet>
    </>
  );
}
