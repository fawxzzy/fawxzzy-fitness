"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { Sheet } from "@/components/ui/Sheet";

// Plain-words explainer for every add-exercise flow (session, quick add, routine day). One visible row in the goal
// panel opens a Sheet that explains Warm-up, Till Failure and (in a workout) the Exercise Timer. It replaces the
// tap-to-reveal INFO dock row as the only place these ideas lived.
export const ADD_EXERCISE_GUIDE_ROWS = {
  warmup: {
    term: "Warm-up",
    body: "While you log a workout you can mark a set as a warm-up. It is saved with the workout, but it does not count toward your goal or your progression.",
  },
  failure: {
    term: "Till Failure",
    body: "Skips the rep range. You go until you cannot do another clean rep. Switch back to Reps-Based to set a rep range.",
  },
  timer: {
    term: "Exercise Timer",
    body: "A stopwatch for this one exercise. It is not a rest timer, and you start, pause and finish it yourself.",
  },
  clock: {
    term: "Workout clock",
    body: "The clock at the top of your workout keeps running for the whole session, with or without an exercise timer.",
  },
} as const;

export function AddExerciseGuide({ showTimer }: { showTimer: boolean }) {
  const [open, setOpen] = useState(false);
  const rows = [
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
