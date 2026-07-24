"use client";

import { useState } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { GlowSwitch } from "@/components/ui/GlowSwitch";

export function ExerciseTimerSetup() {
  const [enabled, setEnabled] = useState(false);

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
      <input type="hidden" name="exerciseTimerMode" value="count_up" />
      <input type="hidden" name="exerciseTimerTargetSeconds" value="" />
    </section>
  );
}
