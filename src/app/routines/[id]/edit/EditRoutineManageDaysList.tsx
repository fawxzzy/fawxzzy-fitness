import Link from "next/link";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { AppRow } from "@/components/ui/app/AppRow";
import { Glass } from "@/components/ui/Glass";
import type { RoutineDayRow } from "@/types/db";

type EditRoutineManageDaysListProps = {
  routineId: string;
  days: RoutineDayRow[];
  dayExerciseCount: Record<string, number>;
  copiedDayId: string;
  copyAction: (formData: FormData) => Promise<void>;
  replaceAction: (formData: FormData) => Promise<void>;
};

function formatRoutineDayLabel(dayIndex: number, dayName: string | null) {
  const fallback = `Day ${dayIndex}`;
  const trimmedName = dayName?.trim() ?? "";
  if (!trimmedName || trimmedName.toLowerCase() === fallback.toLowerCase()) {
    return fallback;
  }

  return `${fallback}: ${trimmedName}`;
}

export function EditRoutineManageDaysList({
  routineId,
  days,
  dayExerciseCount,
  copiedDayId,
  copyAction,
  replaceAction,
}: EditRoutineManageDaysListProps) {
  return (
    <Glass variant="base" className="space-y-4 p-4" interactive={false}>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text">Manage days</h2>
          <span className="rounded-full border border-border/60 bg-[rgb(var(--bg)/0.45)] px-2 py-0.5 text-xs font-medium text-text">
            {days.length} day{days.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-muted">
          Parent editors should emphasize parent metadata. Use these compact rows to jump into the full day editor when you need day-specific changes.
        </p>
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const count = dayExerciseCount[day.id] ?? 0;
          const statusLabel = day.is_rest ? "Rest" : "Training";
          const exerciseLabel = `${count} exercise${count === 1 ? "" : "s"}`;

          return (
            <div key={day.id} className="rounded-xl border border-border/45 bg-surface/35 p-2">
              <Link href={`/routines/${routineId}/edit/day/${day.id}`} className="block">
                <AppRow
                  className="px-3"
                  leftTop={formatRoutineDayLabel(day.day_index, day.name)}
                  leftBottom={day.is_rest ? "Rest day" : "Open Edit Day to rename this day, manage rest/training state, or adjust exercises."}
                  rightTop={statusLabel}
                  rightBottom={exerciseLabel}
                />
              </Link>

              <div className="grid gap-2 border-t border-white/10 px-2 pt-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Link
                  href={`/routines/${routineId}/edit/day/${day.id}`}
                  className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}
                >
                  Edit Day
                </Link>
                <form action={copyAction}>
                  <input type="hidden" name="routineId" value={routineId} />
                  <input type="hidden" name="dayId" value={day.id} />
                  <AppButton type="submit" variant="ghost" fullWidth>
                    Copy
                  </AppButton>
                </form>
                <ConfirmedServerFormButton
                  action={replaceAction}
                  hiddenFields={{ routineId, sourceDayId: copiedDayId, targetDayId: day.id }}
                  triggerLabel="Replace"
                  triggerClassName="w-full disabled:border-border/40 disabled:bg-[rgb(var(--bg)/0.25)]"
                  modalTitle="Replace target day?"
                  modalDescription="Replacing this day will delete the exercises currently on the target day."
                  confirmLabel="Replace"
                  details={`${count} exercises currently on target day.`}
                  size="sm"
                  disabled={!copiedDayId || copiedDayId === day.id}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Glass>
  );
}
