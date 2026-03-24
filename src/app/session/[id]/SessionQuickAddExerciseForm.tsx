"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { RoutineEditorAddExerciseFlowShell, RoutineEditorInlineSection, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

export function SessionQuickAddExerciseForm({
  sessionId,
  exercises,
  weightUnit,
  exerciseStats,
  backHref,
  quickAddExerciseAction,
}: {
  sessionId: string;
  exercises: EditorExerciseOption[];
  weightUnit: "lbs" | "kg";
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
  quickAddExerciseAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [setCountByExerciseId, setSetCountByExerciseId] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const handleSubmit = useCallback(() => {
    if (!selectedExerciseId) {
      toast.error("Select an exercise first.");
      return;
    }

    startTransition(async () => {
      const setCount = setCountByExerciseId[selectedExerciseId] ?? 3;
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("exerciseId", selectedExerciseId);
      formData.set("setCount", String(setCount));

      const result = await quickAddExerciseAction(formData);
      toastActionResult(toast, result, {
        success: "Exercise added to session.",
        error: "Could not add exercise.",
      });

      if (result.ok) {
        router.push(backHref);
        router.refresh();
      }
    });
  }, [backHref, quickAddExerciseAction, router, selectedExerciseId, sessionId, setCountByExerciseId, toast]);

  return (
    <>
      <PublishBottomActions>
        <BottomActionSingle>
          <AppButton type="button" variant="primary" fullWidth loading={isPending} onClick={handleSubmit}>
            Add Exercise To Session
          </AppButton>
        </BottomActionSingle>
      </PublishBottomActions>

      <RoutineEditorAddExerciseFlowShell
        exercises={exercises}
        name="exerciseId"
        initialSelectedId={exercises[0]?.id}
        onSelectedExerciseChange={(exercise) => setSelectedExerciseId(exercise?.id ?? "")}
        weightUnit={weightUnit}
        exerciseStats={exerciseStats}
        renderFooter={({ selectedExercise }) => {
          const activeExerciseId = selectedExercise?.id ?? "";
          const activeSetCount = setCountByExerciseId[activeExerciseId] ?? 3;

          return (
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
          );
        }}
      />
    </>
  );
}
