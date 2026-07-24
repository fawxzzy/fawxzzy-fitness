"use client";

import { useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { GlowSwitch } from "@/components/ui/GlowSwitch";

export function ExerciseTimerSetup() {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"count_up" | "countdown">("countdown");

  return (
    <section className={appTokens.curatedInfoCard} aria-labelledby="exercise-timer-setup-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p id="exercise-timer-setup-title" className={appTokens.curatedCardTitle}>Exercise Timer</p>
          <p className={appTokens.curatedMetaText}>Time this exercise itself. This is not a rest timer.</p>
        </div>
        <GlowSwitch
          checked={enabled}
          ariaLabel="Exercise timer"
          onLabel="On"
          offLabel="Off"
          onClick={() => setEnabled((current) => !current)}
        />
      </div>

      <input type="hidden" name="exerciseTimerEnabled" value={enabled ? "true" : "false"} />
      {enabled ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-semibold text-[rgb(var(--text-secondary)/0.96)]">
            Mode
            <select
              name="exerciseTimerMode"
              value={mode}
              onChange={(event) => setMode(event.target.value === "count_up" ? "count_up" : "countdown")}
              className="min-h-11 rounded-xl border border-[rgb(var(--border-rgb)/0.8)] bg-[rgb(var(--surface-2-rgb)/0.96)] px-3 text-[rgb(var(--text-primary))]"
            >
              <option value="countdown">Countdown</option>
              <option value="count_up">Count up</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-[rgb(var(--text-secondary)/0.96)]">
            Target seconds
            <input
              name="exerciseTimerTargetSeconds"
              type="number"
              inputMode="numeric"
              min={1}
              max={86400}
              defaultValue={60}
              disabled={mode !== "countdown"}
              className="min-h-11 rounded-xl border border-[rgb(var(--border-rgb)/0.8)] bg-[rgb(var(--surface-2-rgb)/0.96)] px-3 text-[rgb(var(--text-primary))] disabled:opacity-55"
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
