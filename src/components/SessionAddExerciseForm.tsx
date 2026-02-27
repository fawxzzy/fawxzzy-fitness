"use client";

import { useRouter } from "next/navigation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

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
};

export function SessionAddExerciseForm({
  sessionId,
  exercises,
  initialSelectedId,
  weightUnit,
  addExerciseAction,
}: {
  sessionId: string;
  exercises: ExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        const result = await addExerciseAction(formData);
        toastActionResult(toast, result, {
          success: "Exercise added.",
          error: "Could not add exercise.",
        });

        if (result.ok) {
          router.refresh();
        }
      }}
      className="space-y-3"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <Card className="space-y-3 border-slate-200/70">
        <ExercisePicker exercises={exercises} name="exerciseId" initialSelectedId={initialSelectedId} routineTargetConfig={{ weightUnit }} />
        <Button type="submit" variant="primary" className="w-full">Add Exercise</Button>
      </Card>
    </form>
  );
}
