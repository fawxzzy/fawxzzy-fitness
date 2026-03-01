"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";

type RoutineItem = {
  id: string;
  name: string;
  summary?: string;
};

type RoutineSwitcherBarProps = {
  activeRoutineId: string | null;
  activeRoutineName: string;
  routines: RoutineItem[];
  setActiveRoutineAction: (formData: FormData) => Promise<void>;
};

export function RoutineSwitcherBar({
  activeRoutineId,
  activeRoutineName,
  routines,
  setActiveRoutineAction,
}: RoutineSwitcherBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/40 bg-surface/55 px-3 py-2 text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="routine-switcher-sheet"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-text">{activeRoutineName}</span>
          <span className="mt-1 block h-0.5 w-10 rounded-full bg-accent/60" aria-hidden="true" />
        </span>
        <span className={`text-xs text-muted transition-transform ${open ? "rotate-180" : "rotate-0"}`} aria-hidden="true">
          ⌄
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Switch routine">
        <div id="routine-switcher-sheet" className="max-h-[70vh] space-y-1 overflow-y-auto pb-2">
          {routines.map((routine) => {
            const isCurrent = routine.id === activeRoutineId;

            return (
              <form key={routine.id} action={setActiveRoutineAction}>
                <input type="hidden" name="routineId" value={routine.id} />
                <button
                  type="submit"
                  onClick={() => setOpen(false)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    isCurrent
                      ? "border-accent/45 bg-accent/12 text-text"
                      : "border-transparent bg-surface/45 text-muted hover:border-border/35 hover:text-text"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{routine.name}</span>
                    {routine.summary ? <span className="block truncate pt-0.5 text-xs text-muted/80">{routine.summary}</span> : null}
                  </span>
                  {isCurrent ? (
                    <span className="ml-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                      Active
                    </span>
                  ) : null}
                </button>
              </form>
            );
          })}

          <Link
            href="/routines/new"
            onClick={() => setOpen(false)}
            className="mt-2 flex min-h-11 items-center rounded-lg border border-border/45 bg-surface/45 px-3 py-2 text-sm font-medium text-text hover:bg-surface-2-soft"
          >
            Create New Routine
          </Link>
        </div>
      </BottomSheet>
    </>
  );
}
