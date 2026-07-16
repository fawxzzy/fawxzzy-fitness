"use client";

import { useState } from "react";
import { RoutineDayKindSelector, type RoutineDayKind } from "@/components/routines/RoutineDayKindSelector";

export function RoutineDayKindReviewPanel() {
  const [dayKind, setDayKind] = useState<RoutineDayKind>("optional");

  return (
    <section className="rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-3 py-3" data-routine-day-kind-review="true">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Day type</h2>
        <span className="text-[11px] font-medium capitalize text-[rgb(var(--accent-strong))]">{dayKind}</span>
      </div>
      <RoutineDayKindSelector value={dayKind} onChange={setDayKind} />
      <p className="mt-2.5 text-[12px] leading-5 text-[rgb(var(--text-secondary)/0.88)]">
        {dayKind === "optional"
          ? "Optional workouts stay available to log. Skipping one does not affect your required plan."
          : dayKind === "required"
            ? "Required workouts count toward your plan and are marked missed when their planned day passes."
            : "Rest days are excluded from planned workout statistics."}
      </p>
    </section>
  );
}
