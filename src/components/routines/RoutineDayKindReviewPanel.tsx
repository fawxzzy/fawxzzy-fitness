"use client";

import { useState } from "react";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { RoutineDayKindCycleAction } from "@/components/routines/RoutineDayKindCycleAction";
import { getNextRoutineDayKind, getRoutineDayKindLabel, type RoutineDayKind } from "@/lib/routine-day-kind";

export function RoutineDayKindReviewPanel() {
  const [dayKind, setDayKind] = useState<RoutineDayKind>("required");
  const nextDayKind = getNextRoutineDayKind(dayKind);

  return (
    <section className="rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-3 py-3" data-routine-day-kind-review="true">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Lower A</h2>
        <span className="text-[11px] font-medium text-[rgb(var(--accent-strong))]">{getRoutineDayKindLabel(dayKind)}</span>
      </div>
      <div className="overflow-hidden rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.16)]">
        <div className="px-3 py-3 text-[12px] text-[rgb(var(--text-secondary)/0.9)]">
          {dayKind === "required" ? "Planned training day" : dayKind === "optional" ? "Optional training day" : "Rest day"}
        </div>
        <AttachedCardActionStripFrame gridClassName="grid-cols-1">
          <RoutineDayKindCycleAction
            dayKind={dayKind}
            dayName="Lower A"
            onCycle={() => setDayKind(nextDayKind)}
            className={nextDayKind === "required"
              ? getAttachedCardActionButtonClassName({ intent: "toggleActive" })
              : getAttachedCardActionButtonClassName({ intent: "toggleInactive" })}
          />
        </AttachedCardActionStripFrame>
      </div>
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
