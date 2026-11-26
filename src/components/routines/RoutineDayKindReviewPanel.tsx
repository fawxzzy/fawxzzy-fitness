"use client";

import { useState } from "react";
import { MoreOptionsDisclosure, OptionSwitchRow } from "@/components/ui/measurements/OptionControls";
import type { RoutineDayKind } from "@/lib/routine-day-kind";

// Dev review mirror of the edit-day type control (SIMPLIFY #9): a Rest day switch, with the rare Bonus day
// ("not counted if skipped") under More options instead of a "Set Optional" card on top of every day.
export function RoutineDayKindReviewPanel() {
  const [dayKind, setDayKind] = useState<RoutineDayKind>("required");

  return (
    <section className="rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-3 py-2" data-routine-day-kind-review="true">
      <div className="flex items-baseline justify-between gap-3 px-1 pt-1">
        <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Lower A</h2>
        <span className="text-[11px] font-medium text-[rgb(var(--accent-strong))]">{dayKind === "rest" ? "Rest" : dayKind === "optional" ? "Bonus" : "Training"}</span>
      </div>
      <OptionSwitchRow
        label="Rest day"
        hint={dayKind === "rest" ? "Rest days are not counted." : dayKind === "optional" ? "Bonus day (not counted if skipped)" : "Training day. Counts toward your plan."}
        checked={dayKind === "rest"}
        onCheckedChange={(next) => setDayKind(next ? "rest" : "required")}
      />
      <MoreOptionsDisclosure>
        <OptionSwitchRow
          label="Bonus day"
          hint="Not counted if skipped."
          checked={dayKind === "optional"}
          disabled={dayKind === "rest"}
          onCheckedChange={(next) => setDayKind(next ? "optional" : "required")}
        />
      </MoreOptionsDisclosure>
    </section>
  );
}
