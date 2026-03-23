import Link from "next/link";
import {
  RoutinesListEmpty,
  SharedDayList,
  SharedDayListRow,
  RoutinesSectionCard,
} from "@/components/routines/RoutinesScreenFamily";

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
  routineName,
  days,
}: {
  routineId: string;
  routineName: string;
  days: EditRoutineDayItem[];
}) {
  return (
    <RoutinesSectionCard
      title="Days"
      meta={days.length === 0
        ? "No days yet"
        : days.length === 1
          ? "1 day"
          : `${days.length} days`}
      action={days.length > 0 ? (
        <Link
          href={`/routines/${routineId}`}
          className="text-sm font-medium text-muted underline-offset-4 hover:text-text hover:underline"
        >
          View Routine
        </Link>
      ) : null}
    >
      {days.length > 0 ? (
        <SharedDayList>
          {days.map((day) => {
            const subtitle = [day.summary, day.notes?.trim() || null].filter(Boolean).join(" • ");
            return (
              <SharedDayListRow
                key={day.id}
                title={`Day ${day.dayIndex} | ${day.title}`}
                subtitle={subtitle}
                badgeText={day.isRest ? "Rest Day" : undefined}
                state={day.isRest ? "empty" : "default"}
                rightIcon={<span aria-hidden="true" className="text-muted">Edit</span>}
                wrapper={(child) => (
                  <Link href={day.href} aria-label={`Edit ${routineName} ${day.title}`} className="block">
                    {child}
                  </Link>
                )}
              />
            );
          })}
        </SharedDayList>
      ) : (
        <RoutinesListEmpty>Set a cycle length above to generate days, then open a day here to edit its details.</RoutinesListEmpty>
      )}
    </RoutinesSectionCard>
  );
}
