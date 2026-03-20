"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";

type EditDayHeaderSwitcherDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  exerciseSummary: string;
};

type EditDayHeaderSwitcherProps = {
  routineId: string;
  routineName: string;
  days: EditDayHeaderSwitcherDay[];
  activeDayId: string;
  activeDayTitle: string;
  activeDaySummary: string;
  backHref: string;
};

function buildDayHref(routineId: string, dayId: string, backHref: string) {
  return `/routines/${routineId}/edit/day/${dayId}?returnTo=${encodeURIComponent(backHref)}`;
}

export function EditDayHeaderSwitcher({
  routineId,
  routineName,
  days,
  activeDayId,
  activeDayTitle,
  activeDaySummary,
  backHref,
}: EditDayHeaderSwitcherProps) {
  const [open, setOpen] = useState(false);

  const activeDay = useMemo(
    () => days.find((day) => day.id === activeDayId) ?? null,
    [activeDayId, days],
  );

  return (
    <section className="space-y-0">
      <div className="rounded-[1.45rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.72)] p-4 shadow-[0_10px_28px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Edit Day</p>
              <h1 className="text-xl font-bold leading-tight text-[rgb(var(--text)/0.98)]">{activeDayTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <p className="text-[rgb(var(--text)/0.72)]">{routineName}</p>
              <p className="text-[rgb(var(--text)/0.58)]">{activeDaySummary}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                open
                  ? "border-accent/45 bg-accent/12 text-[rgb(var(--text)/0.98)]"
                  : "border-border/45 bg-[rgb(var(--bg)/0.24)] text-[rgb(var(--text)/0.82)] hover:border-accent/35 hover:bg-accent/8 hover:text-[rgb(var(--text)/0.98)]",
              )}
              aria-expanded={open}
              aria-controls="edit-day-switcher-panel"
            >
              <span>{open ? "Hide Days" : "Select Day"}</span>
              <span aria-hidden="true" className={cn("text-xs transition-transform", open ? "rotate-180" : "rotate-0")}>⌄</span>
            </button>
          </div>

          <Link href={backHref} className={getAppButtonClassName({ variant: "secondary", size: "sm" })}>
            Back
          </Link>
        </div>
      </div>

      {open ? (
        <div
          id="edit-day-switcher-panel"
          className="-mt-px rounded-b-[1.45rem] border border-border/45 border-t-0 bg-[rgb(var(--surface-2-soft)/0.84)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.16)]"
        >
          <div className="space-y-1 px-1 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Select Day</p>
            <p className="text-xs text-muted">Reuse the same day-switching pattern from routine selection so edits stay anchored to this header.</p>
          </div>
          <div className="space-y-2">
            {days.map((day) => {
              const isCurrent = day.id === activeDayId;
              const dayHref = buildDayHref(routineId, day.id, backHref);
              const summary = day.isRest ? "Rest day" : day.exerciseSummary;

              return isCurrent ? (
                <div
                  key={day.id}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-[1.1rem] border border-accent/45 bg-[linear-gradient(180deg,rgba(96,200,130,0.18),rgba(96,200,130,0.08))] px-3 py-3 text-left shadow-[0_12px_28px_-24px_rgba(96,200,130,0.95)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[rgb(var(--text)/0.98)]">{day.name}</span>
                    <span className="block pt-0.5 text-xs text-[rgb(var(--text)/0.66)]">{summary}</span>
                  </span>
                  <span className="shrink-0 rounded-full border border-accent/45 bg-accent/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text)/0.92)]">
                    Current
                  </span>
                </div>
              ) : (
                <Link
                  key={day.id}
                  href={dayHref}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-[1.1rem] border border-transparent bg-[rgb(var(--bg)/0.2)] px-3 py-3 text-left transition hover:border-border/45 hover:bg-[rgb(var(--bg)/0.3)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[rgb(var(--text)/0.92)]">{day.name}</span>
                    <span className="block pt-0.5 text-xs text-muted">{summary}</span>
                  </span>
                  <span className="text-sm text-muted" aria-hidden="true">›</span>
                </Link>
              );
            })}
          </div>
          {activeDay ? <input type="hidden" value={activeDay.id} readOnly className="hidden" /> : null}
        </div>
      ) : null}
    </section>
  );
}
