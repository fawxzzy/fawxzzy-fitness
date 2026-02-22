"use client";

import { useRouter } from "next/navigation";
import { ExercisePicker } from "@/components/ExercisePicker";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
};

type AddExerciseResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export function SessionAddExerciseForm({
  sessionId,
  exercises,
  initialSelectedId,
  addExerciseAction,
}: {
  sessionId: string;
  exercises: ExerciseOption[];
  initialSelectedId?: string;
  addExerciseAction: (formData: FormData) => Promise<AddExerciseResult>;
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
      className="space-y-2"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <ExercisePicker exercises={exercises} name="exerciseId" initialSelectedId={initialSelectedId} />
      <button type="submit" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">Add</button>
    </form>
  );
}
