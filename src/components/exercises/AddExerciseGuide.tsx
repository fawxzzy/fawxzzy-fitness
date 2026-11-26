"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Sheet } from "@/components/ui/Sheet";

// Plain-words explainer for every add-exercise flow (session, quick add, routine day). One visible row in the goal
// panel opens a Sheet that explains the goal fields, Warm-up, Failure and (in a workout) the Exercise Timer and the
// workout clock and rest timer. It is the one plain-words home for these ideas when adding an exercise. (The old INFO
// dock row is gone: the goal panel no longer renders one, so this Sheet is the only place the goal fields are explained.)
// Every row describes something the app does today, in the words the controls use ("Failure" and "Reps" on the toggle).
// The workout clock and rest timer shipped 2026-11-26 (DESIGN #2): the clock sits left of Pause in the workout header,
// the rest countdown appears above Finish after each logged set. Keep this row in step with SessionHeaderControls and
// RestTimer.
export const ADD_EXERCISE_GUIDE_ROWS = {
  goal: {
    term: "Goal",
    body: "Sets is how many sets you plan. Reps is the range you aim for in each set, with Weight, Time or Distance when the exercise uses them. The goal is what Today shows and what progression checks you against; you can change it any time.",
  },
  warmup: {
    term: "Warm-up",
    body: "While you log a workout you can mark a set as a warm-up. It is saved with the workout, but it is left out when your progression is worked out.",
  },
  failure: {
    term: "Failure",
    body: "Skips the rep range. You go until you cannot do another clean rep. Switch back to Reps to set a rep range.",
  },
  timer: {
    term: "Exercise Timer",
    body: "A stopwatch for this one exercise. You start, pause and finish it yourself. It is separate from the rest timer.",
  },
  clock: {
    term: "Workout clock and rest",
    body: "The clock at the top of a workout shows how long you have been going. After you log a set, a 90-second rest countdown appears above Finish: tap -15 or +15 to change it, or Skip to hide it.",
  },
} as const;

export function AddExerciseGuide({ showTimer }: { showTimer: boolean }) {
  const [open, setOpen] = useState(false);
  const rows = [
    ADD_EXERCISE_GUIDE_ROWS.goal,
    ADD_EXERCISE_GUIDE_ROWS.warmup,
    ADD_EXERCISE_GUIDE_ROWS.failure,
    ...(showTimer ? [ADD_EXERCISE_GUIDE_ROWS.timer, ADD_EXERCISE_GUIDE_ROWS.clock] : []),
  ];
  return (
    <>
      <AppButton type="button" variant="secondary" size="sm" fullWidth onClick={() => setOpen(true)} data-add-exercise-guide-open>
        How Warm-up{showTimer ? ", Failure and Timer" : " and Failure"} work
      </AppButton>
      <Sheet
        open={open}
        title="How This Works"
        onClose={() => setOpen(false)}
        dialogProps={{ "data-add-exercise-guide": "true" }}
      >
        <dl className="space-y-3 pb-2">
          {rows.map((row) => (
            <div key={row.term}>
              <dt className="text-[length:var(--type-caption)] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent)/0.9)]">{row.term}</dt>
              <dd className="mt-0.5 text-[0.9rem] leading-snug text-[rgb(var(--text-primary)/0.92)]">{row.body}</dd>
            </div>
          ))}
        </dl>
      </Sheet>
    </>
  );
}
