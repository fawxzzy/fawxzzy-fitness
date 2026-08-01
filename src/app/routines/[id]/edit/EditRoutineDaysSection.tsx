import Link from "next/link";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { appTokens } from "@/components/ui/app/tokens";
import { RoutineEditorDayRow, RoutineEditorSection } from "@/components/routines/RoutineEditorShared";

type EditRoutineDayItem = {
  id: string;
  dayIndex: number;
  title: string;
  isRest: boolean;
  summary: string;
  notes: string | null;
  href: string;
  needsSetup?: boolean;
};

export function EditRoutineDaysSection({
  routineId,
  days,
}: {
  routineId: string;
  days: EditRoutineDayItem[];
}) {
  return (
    <RoutineEditorSection
      title="Workout Plans"
      description={days.length === 0
        ? "No workout plans yet"
        : days.length === 1
          ? "1 workout plan"
          : `${days.length} workout plans`}
    >
      {days.length > 0 ? (
        <div className="flex justify-end">
          <Link
            href={`/routines/${routineId}`}
            className={appTokens.routineEditorLinkAction}
          >
            View Routine
          </Link>
        </div>
      ) : null}
      {days.length > 0 ? (
        <ul className={appTokens.routineEditorDayList}>
          {days.map((day) => {
            const subtitle = day.needsSetup
              ? "Not configured yet • Tap to set up this workout plan"
              : [day.summary, day.notes?.trim() || null].filter(Boolean).join(" • ");
            return (
              <li key={day.id}>
                <RoutineEditorDayRow
                  title={`Slot ${day.dayIndex} | ${day.title}`}
                  subtitle={subtitle}
                  badgeText={day.needsSetup ? "Needs Setup" : undefined}
                  state={day.isRest || day.needsSetup ? "empty" : "default"}
                  href={day.href}
                  rightLabel={<AppBadge tone="default">Edit</AppBadge>}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={appTokens.routineEditorHelperText}>
          Set a cycle length above to generate workout plans, then open one here to edit its details.
        </p>
      )}
    </RoutineEditorSection>
  );
}
