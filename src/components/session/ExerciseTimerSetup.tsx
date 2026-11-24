"use client";

import { useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

// Visible timer setup for the add-exercise flow: a labelled Off/On control with one plain line of copy, instead of a
// bare switch. The saved shape is unchanged (exerciseTimerEnabled / Mode / Target); only the surface is new.
export function ExerciseTimerSetup() {
  const [enabled, setEnabled] = useState(false);

  return (
    <section className="rounded-[1.2rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.5)] px-3 py-2.5" aria-labelledby="exercise-timer-setup-title" data-exercise-timer-setup>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p id="exercise-timer-setup-title" className={appTokens.curatedCardTitle}>Exercise Timer</p>
          <p className={appTokens.curatedMetaText}>
            {enabled
              ? "A stopwatch for this exercise. You start it in your workout."
              : "Optional stopwatch for this exercise. Not a rest timer."}
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Exercise timer"
          size="sm"
          fitContent
          value={enabled ? "on" : "off"}
          options={[
            { label: "Off", value: "off" },
            { label: "On", value: "on" },
          ]}
          onChange={(next) => setEnabled(next === "on")}
        />
      </div>

      <input type="hidden" name="exerciseTimerEnabled" value={enabled ? "true" : "false"} />
      <input type="hidden" name="exerciseTimerMode" value="count_up" />
      <input type="hidden" name="exerciseTimerTargetSeconds" value="" />
    </section>
  );
}
