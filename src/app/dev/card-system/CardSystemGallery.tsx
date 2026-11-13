"use client";

import { useState, type ReactNode } from "react";
import { RoutineOverviewDayCard, RestDayCard, type RoutineOverviewDayCardItem } from "@/components/day-list/RoutineDayCardPresentation";
import { TodayDayStateCard } from "@/app/today/TodayDayStateCard";
import { TodayExerciseRows, type TodayExerciseRow } from "@/app/today/TodayExerciseRows";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import { WorkoutPlanChooserSourceCard } from "@/components/routines/WorkoutPlanChooserSourceCard";
import {
  CardActionRow,
  CardChip,
  CardChips,
  CardEmptyState,
  CardHeader,
  CardInfoButton,
  CardMeta,
  CardNotice,
  CardStatusChip,
  CardSurface,
  DragHandle,
  StatBlock,
  cardStatusChips,
  cardTokens,
  type CardStatusChipKey,
  type CardTone,
} from "@/components/ui/card-system";
import { ExerciseRowCard } from "@/components/workout/ExerciseRowCard";
import { getRoutineDayHeading } from "@/lib/routines";

const START_DATE = "2026-04-27";

const todayRows: TodayExerciseRow[] = [
  { id: "t1", exerciseId: "gallery-squat", name: "Back Squat", targets: "4 sets • 5 reps • 225 lbs", primary_muscle: "Quads", movement_pattern: "Squat", equipment: "Barbell", targetSetsMin: 4, targetSetsMax: 4, loggedSetCount: 4, progressionStateLabel: "AUTO | SESSION | SET" },
  { id: "t2", exerciseId: "gallery-lunge", name: "Walking Lunge With Dumbbells And A Long Name", targets: "3 sets • 8-10 reps", primary_muscle: "Glutes", movement_pattern: "Lunge", targetSetsMin: 3, targetSetsMax: 3, loggedSetCount: 1 },
  { id: "t3", exerciseId: "gallery-rdl", name: "Romanian Deadlift", targets: "3 sets • 8 reps • 185 lbs", primary_muscle: "Hamstrings", movement_pattern: "Hinge", targetSetsMin: 3, targetSetsMax: 3, loggedSetCount: 0 },
  { id: "t4", exerciseId: "gallery-walk", name: "Incline Walk", targets: "1 set • 20 min", primary_muscle: "Cardio", movement_pattern: "Gait", targetSetsMin: 1, targetSetsMax: 1, isSkipped: true },
];

const previewDays: NonNullable<RoutineBrowseCardItem["previewDays"]> = [
  { id: "d1", dayIndex: 1, title: "Push", weekdayLabel: "Mon", isRest: false, isCompleted: true, exerciseCount: 6 },
  { id: "d2", dayIndex: 2, title: "Pull", weekdayLabel: "Tue", isRest: false, exerciseCount: 7 },
  { id: "d3", dayIndex: 3, title: "Rest", weekdayLabel: "Wed", isRest: true, exerciseCount: 0 },
  { id: "d4", dayIndex: 4, title: "Legs", weekdayLabel: "Thu", isRest: false, exerciseCount: 8 },
  { id: "d5", dayIndex: 5, title: "Upper", weekdayLabel: "Fri", isRest: false, isSkipped: true, exerciseCount: 5 },
  { id: "d6", dayIndex: 6, title: "Day 6", weekdayLabel: "Sat", isRest: false, exerciseCount: 0 },
  { id: "d7", dayIndex: 7, title: "Rest", weekdayLabel: "Sun", isRest: true, exerciseCount: 0 },
];

const activeRoutine: RoutineBrowseCardItem = {
  id: "r1",
  name: "Atlas Strength Block",
  summaryParts: ["26 exercises", "5 workout plans", "2 rest", "12 sessions logged", "Last Nov 10"],
  createdAt: "2026-09-02T12:00:00Z",
  isActive: true,
  previewDays,
};
const inactiveRoutine: RoutineBrowseCardItem = {
  id: "r2",
  name: "Hypertrophy Offseason With A Deliberately Long Routine Name",
  summaryParts: ["14 exercises", "4 workout plans", "0 rest", "No sessions logged", "Not started"],
  createdAt: "2026-10-20T12:00:00Z",
  isActive: false,
};

const recap = [
  { id: "e1", name: "Back Squat", targetLabel: "4 sets · 5 reps", signatureLabel: "Quads | Squat | Barbell", progressionStateLabel: "AUTO • SESSION • SET" },
  { id: "e2", name: "Romanian Deadlift", targetLabel: "3 sets · 8 reps", signatureLabel: "Hamstrings | Hinge | Barbell", progressionStateLabel: "MANUAL" },
  { id: "e3", name: "Walking Lunge With Dumbbells And A Long Name", targetLabel: "4 sets · 8–10 reps", signatureLabel: "Glutes | Lunge | Dumbbell" },
];

function day(partial: Partial<RoutineOverviewDayCardItem> & { dayIndex: number }): RoutineOverviewDayCardItem {
  return {
    isRest: false,
    isToday: false,
    isCompleted: false,
    isSkipped: false,
    isInSession: false,
    splitSummary: { total: 3, strength: 2, cardio: 1, bodyweight: 0, unknown: 0 },
    recapExercises: recap,
    ...partial,
  };
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="grid gap-2" aria-label={title}>
      <h2 className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.98)]">{title}</h2>
      {note ? <p className="m-0 text-xs leading-snug text-[rgb(var(--text-secondary)/0.9)]">{note}</p> : null}
      <div className="grid gap-2">{children}</div>
    </section>
  );
}

export function CardSystemGallery() {
  const [expandedDay, setExpandedDay] = useState<string | null>("expanded");
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>("r1");
  const [expandedExercise, setExpandedExercise] = useState<string | null>("ex-open");
  const [selectedSource, setSelectedSource] = useState(true);

  const noop = () => {};
  const tones: CardTone[] = ["neutral", "current", "logged", "completed", "attention", "pr"];
  const chipKeys = Object.keys(cardStatusChips) as CardStatusChipKey[];

  const reordered = [
    { id: "a", storedName: "1", dayIndex: 1 },
    { id: "b", storedName: "7", dayIndex: 2 },
    { id: "c", storedName: "Push", dayIndex: 3 },
    { id: "d", storedName: "Tue", dayIndex: 4 },
  ];

  return (
    <div className="grid gap-6" data-card-system-gallery="true">
      <header className="grid gap-1">
        <h1 className="m-0 text-xl font-semibold tracking-tight text-[rgb(var(--text-primary))]">Card system</h1>
        <p className="m-0 text-sm text-[rgb(var(--text-secondary)/0.95)]">One surface, one header, one set of controls. Dev only.</p>
      </header>

      <Section title="Routine card" note="Header opens the routine. The more control reveals Delete and Set Active. Week strip wraps, never scrolls.">
        <RoutineBrowseCard
          routine={activeRoutine}
          onPress={noop}
          actions={[{ key: "delete", label: "Delete", intent: "danger", onPress: noop }]}
          actionsOpen={expandedRoutine === "r1"}
          onActionsToggle={() => setExpandedRoutine((current) => (current === "r1" ? null : "r1"))}
        />
        <RoutineBrowseCard
          routine={inactiveRoutine}
          onPress={noop}
          showPreviewDays={false}
          actions={[
            { key: "delete", label: "Delete", intent: "danger", onPress: noop },
            { key: "set-active", label: "Set Active", intent: "toggle", onPress: noop },
          ]}
          actionsOpen={expandedRoutine === "r2"}
          onActionsToggle={() => setExpandedRoutine((current) => (current === "r2" ? null : "r2"))}
        />
        <RoutineBrowseCard routine={{ ...activeRoutine, id: "r3", name: "Offline copy (static)" }} showPreviewDays={false} />
      </Section>

      <Section title="Day card" note="Headline is the custom title or Day N. Day N and the weekday are always in the meta line. Tap toggles the recap and actions.">
        <ul className={cardTokens.list}>
          <li>
            <RoutineOverviewDayCard day={day({ dayIndex: 1, name: "1", occurrenceWeekday: "Mon" })} startDate={START_DATE} interaction="press" onPress={noop}
              reorderHandle={<DragHandle label="Reorder Day 1" />} />
          </li>
          <li>
            <RoutineOverviewDayCard day={day({ dayIndex: 2, name: "Push", occurrenceWeekday: "Tue", isToday: true })} startDate={START_DATE} interaction="press" onPress={noop}
              reorderHandle={<DragHandle label="Reorder Push" />} />
          </li>
          <li>
            <RoutineOverviewDayCard day={day({ dayIndex: 3, name: "Pull", occurrenceWeekday: "Wed", isCompleted: true })} startDate={START_DATE} interaction="press" onPress={noop}
              reorderHandle={<DragHandle label="Reorder Pull" />} />
          </li>
          <li>
            <RoutineOverviewDayCard day={day({ dayIndex: 4, name: "4", occurrenceWeekday: "Thu", isSkipped: true, isOptional: true })} startDate={START_DATE} interaction="press" onPress={noop}
              reorderHandle={<DragHandle label="Reorder Day 4" />} />
          </li>
          <li>
            <RoutineOverviewDayCard day={day({ dayIndex: 5, name: "Recovery", occurrenceWeekday: "Fri", isRest: true, splitSummary: undefined, recapExercises: [] })} startDate={START_DATE} interaction="press" onPress={noop}
              reorderHandle={<DragHandle label="Reorder Recovery" />} />
          </li>
          <li>
            <RoutineOverviewDayCard
              day={day({ dayIndex: 6, name: "Legs And Core With A Long Custom Title", occurrenceWeekday: "Sat", isInSession: true })}
              startDate={START_DATE}
              interaction="toggle"
              isExpanded={expandedDay === "expanded"}
              controlsId="gallery-day-panel"
              onPress={() => setExpandedDay((current) => (current === "expanded" ? null : "expanded"))}
              reorderHandle={<DragHandle label="Reorder Legs And Core" active />}
              footer={expandedDay === "expanded" ? (
                <CardActionRow
                  label="Actions for Legs And Core"
                  actions={[
                    { key: "delete", label: "Delete", intent: "danger", onPress: noop },
                    { key: "kind", label: "Set Optional", intent: "neutral", onPress: noop },
                    { key: "edit", label: "Edit", intent: "primary", onPress: noop },
                  ]}
                />
              ) : undefined}
            />
          </li>
          <li><RestDayCard /></li>
        </ul>
      </Section>

      <Section title="Day-label rule after a reorder" note="Stored names are placeholders (1, 7, Tue) or titles (Push). Position and weekday always come from the day position.">
        <ul className={cardTokens.list}>
          {reordered.map((entry) => {
            const heading = getRoutineDayHeading({ name: entry.storedName, dayIndex: entry.dayIndex, startDate: START_DATE, weekdayLabel: ["Mon", "Tue", "Wed", "Thu"][entry.dayIndex - 1] });
            return (
              <li key={entry.id}>
                <CardSurface tone="neutral">
                  <CardHeader title={heading.title} meta={<CardMeta items={[...heading.metaParts, `stored name: ${entry.storedName}`]} />} />
                </CardSurface>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Exercise card" note="Thumbnail, name, meta, target. Info and drag handle are separate 44px controls. Tap toggles the editor panel.">
        <ExerciseRowCard
          exercise={{ name: "Back Squat" }}
          metaItems={["Quads", "Squat"]}
          targetValues={["4 sets", "5 reps", "225 lbs"]}
          progressionLabel={"AUTO · SESSION · SET"}
          interaction={{ kind: "toggle", expanded: false, onToggle: noop, controlsId: "gallery-ex-closed" }}
          trailing={<><DragHandle label="Reorder Back Squat" /><CardInfoButton label="Open exercise info for Back Squat" /></>}
        />
        <ExerciseRowCard
          exercise={{ name: "Romanian Deadlift With A Deliberately Very Long Exercise Name" }}
          metaItems={["Hamstrings", "Hinge"]}
          targetValues={["3 sets", "8 reps", "185 lbs"]}
          tone={expandedExercise === "ex-open" ? "current" : "neutral"}
          interaction={{ kind: "toggle", expanded: expandedExercise === "ex-open", onToggle: () => setExpandedExercise((current) => (current === "ex-open" ? null : "ex-open")), controlsId: "gallery-ex-open" }}
          trailing={<><DragHandle label="Reorder Romanian Deadlift" active /><CardInfoButton label="Open exercise info for Romanian Deadlift" /></>}
          panel={expandedExercise === "ex-open" ? <p className="m-0 text-sm text-[rgb(var(--text-secondary)/0.95)]">Editor panel content renders here.</p> : undefined}
          panelProps={{ id: "gallery-ex-open" }}
        />
      </Section>

      <Section title="Today exercise cards" note="Static cards: thumbnail, name, meta, target, logged progress as text. DONE and SKIPPED are chips; skipped is compact. Info is a 44px control.">
        <TodayExerciseRows exercises={todayRows} emptyMessage="No exercises today." />
      </Section>

      <Section title="Today empty and state cards" note="Rest day, empty day (with the way out), partial and blocked days, no scheduled workout.">
        <RestDayCard headingLevel={2} />
        <CardEmptyState
          title="No exercises planned"
          body="Add exercises to this day to start a workout from Today."
          action={<span className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[rgb(var(--accent)/0.4)] px-4 text-sm font-semibold">Add exercises</span>}
        />
        <TodayDayStateCard tone="warning" title="Some exercises will be skipped" body="Some exercises could not be loaded and will be skipped when you start this workout." />
        <TodayDayStateCard tone="blocking" title="Edit this day first" body="This day has invalid exercises. Edit the day before starting a workout." />
        <TodayDayStateCard title="No scheduled workout today." body="Pick a day to run from Switch Day." />
      </Section>

      <Section title="Notices" note="Inline screen notices: status for neutral and attention, alert for danger; a glyph backs the colour.">
        <CardNotice>Start session requires a live connection.</CardNotice>
        <CardNotice tone="attention">Some exercises could not be loaded.</CardNotice>
        <CardNotice tone="danger">Could not load Today. Try again.</CardNotice>
      </Section>

      <Section title="Chooser card (select)" note="Selection is aria-pressed with a visible SELECTED chip.">
        <WorkoutPlanChooserSourceCard
          selected={selectedSource}
          onPress={() => setSelectedSource((current) => !current)}
          source={{ dayIndex: 2, title: "Push", occurrenceWeekday: "Tue", isRest: false, splitSummary: { total: 3, strength: 2, cardio: 1, bodyweight: 0, unknown: 0 }, recapExercises: recap }}
        />
      </Section>

      <Section title="Status chips" note="Text is always present; DONE and SKIPPED add a glyph.">
        <CardChips flush>
          {chipKeys.map((key) => <CardStatusChip key={key} status={key} />)}
          <CardChip tone="danger">Failed</CardChip>
        </CardChips>
      </Section>

      <Section title="Tones" note="Rail and ring colour per semantic tone (cardSemanticTones.ts); a text cue always accompanies it.">
        {tones.map((tone) => (
          <CardSurface key={tone} tone={tone}>
            <CardHeader title={`Tone: ${tone}`} meta={<CardMeta items={["Meta line", "second fact"]} />} />
          </CardSurface>
        ))}
      </Section>

      <Section title="Stat block and meta">
        <CardSurface showRail={false}>
          <div className="grid gap-3 px-4 py-3">
            <StatBlock label="Target" values={["4 sets", "5 reps", "225 lbs"]} />
            <CardMeta items={["Quads", "Squat", "Barbell", null, "AUTO"]} flush />
          </div>
        </CardSurface>
      </Section>

      <Section title="Empty state">
        <CardEmptyState title="No routines yet" body="Create a routine to unify Today, session tracking, and history around the same training plan." action={<button type="button" className="min-h-11 w-full rounded-full border border-[rgb(var(--accent)/0.4)] px-4 text-sm font-semibold">Create your first routine</button>} />
      </Section>
    </div>
  );
}
