"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
};

export function QuickAddExerciseSheet({
  sessionId,
  exercises,
  quickAddExerciseAction,
}: {
  sessionId: string;
  exercises: ExerciseOption[];
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
        title="Quick Add Exercise"
        description="Select an exercise and add starter sets."
        className="max-w-md"
        contentClassName="space-y-5"
      >
        <ExercisePicker
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
                <section className="space-y-3 rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.58)] p-4">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Starting volume</p>
                    <p className="text-xs text-muted">Choose how many starter sets to add for the selected exercise.</p>
                  </div>
                  <div className="flex items-start justify-between gap-3 rounded-[1rem] border border-border/35 bg-[rgb(var(--bg)/0.14)] px-3 py-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-text">
                        {selectedExercise ? `${activeSetCount} set${activeSetCount === 1 ? "" : "s"} to start` : "Choose an exercise first"}
                      </p>
                      <p className="text-xs text-muted">Quick Add keeps the same exercise-selection flow as Edit Day and only changes what happens after selection.</p>
                    </div>
                    <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted">Volume</span>
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
                </section>

                <div className="sticky bottom-0 -mx-4 bg-[rgb(var(--surface-rgb)/0.985)] px-4 pb-[max(0.25rem,var(--app-safe-bottom))] pt-3">
                  <BottomActionSingle className={cn("border-white/10 bg-[rgb(var(--surface-rgb)/0.985)]")}>
                    <AppButton type="button" variant="primary" fullWidth loading={isPending} onClick={handleSubmit}>
                      Add to Session
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
