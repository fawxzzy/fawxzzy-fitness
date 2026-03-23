import Link from "next/link";
import { RoutineEditorDayRow, RoutineEditorSection } from "@/components/routines/RoutineEditorShared";

type EditRoutineDayItem = {
  id: string;
  dayIndex: number;
  title: string;
  isRest: boolean;
  summary: string;
  notes: string | null;
  href: string;
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
      title="Days"
      description={days.length === 0
        ? "No days yet"
        : days.length === 1
          ? "1 day"
          : `${days.length} days`}
    >
      {days.length > 0 ? (
        <div className="flex justify-end">
          <Link
            href={`/routines/${routineId}`}
            className="text-sm font-medium text-muted underline-offset-4 hover:text-text hover:underline"
          >
            View Routine
          </Link>
        </div>
      ) : null}
      {days.length > 0 ? (
        <ul className="space-y-2">
          {days.map((day) => {
            const subtitle = [day.summary, day.notes?.trim() || null].filter(Boolean).join(" • ");
            return (
              <li key={day.id}>
                <RoutineEditorDayRow
                  title={`Day ${day.dayIndex} | ${day.title}`}
                  subtitle={subtitle}
                  badgeText={day.isRest ? "Rest Day" : undefined}
                  state={day.isRest ? "empty" : "default"}
                  href={day.href}
                  rightLabel={<span aria-hidden="true" className="text-muted">Edit</span>}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-1 text-sm text-muted">Set a cycle length above to generate days, then open a day here to edit its details.</p>
      )}
    </RoutineEditorSection>
  );
}
