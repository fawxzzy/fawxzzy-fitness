"use client";

import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { CreateRoutineClient } from "@/app/routines/CreateRoutineClient";
import { CreateRoutineDayClient } from "@/app/routines/CreateRoutineDayClient";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineEditorPageBody } from "@/components/routines/RoutineEditorShared";
import type { RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

const ROUTINES: RoutineBrowseCardItem[] = [
  { id: "r1", name: "Push Pull Legs", summaryParts: ["18 exercises", "6 training days", "1 rest day"], isActive: true, createdAt: "2026-09-01T12:00:00.000Z" },
  { id: "r2", name: "Upper Lower", summaryParts: ["12 exercises", "4 training days", "3 rest days"], createdAt: "2026-07-14T12:00:00.000Z" },
];

const DAYS: WorkoutPlanSourceListItem[] = [
  { id: "d1", workoutPlanTemplateId: "t1", sourceRoutineDayId: "d1", sourceRoutineId: "r1", sourceRoutineName: "Push Pull Legs", isCurrentRoutine: true, dayIndex: 1, title: "Push", weekdayLabel: "Mon", isRest: false },
  { id: "d2", workoutPlanTemplateId: "t2", sourceRoutineDayId: "d2", sourceRoutineId: "r1", sourceRoutineName: "Push Pull Legs", isCurrentRoutine: true, dayIndex: 2, title: "Pull", weekdayLabel: "Tue", isRest: false },
];

const okAction = async () => ({ ok: true as const });

function EditorFixture({ expanded }: { expanded: boolean }) {
  const [values, setValues] = useState({ cycleLengthDays: 7, scheduleMode: "weekday_anchored" as const, startDate: "2026-11-09", startWeekday: "monday", timezone: "America/Chicago", weightUnit: "lbs", distanceUnit: "mi" });
  const [cycleInput, setCycleInput] = useState("7");
  return (
    <RoutineEditorPageBody>
      <div className="space-y-2 pt-4">
        <RoutineEditorFormFields
          fields={["cycleLengthDays", "scheduleMode", "startWeekday", "weightUnit", "distanceUnit", "timezone"]}
          showCycleSection
          sectionsDefaultExpanded={expanded}
          cycleLengthInputValue={cycleInput}
          cycleLengthDefaultValue={7}
          scheduleModeDefaultValue="weekday_anchored"
          startDateDefaultValue={values.startDate}
          startWeekdayDefaultValue="monday"
          timezoneDefaultValue={values.timezone}
          weightUnitDefaultValue="lbs"
          distanceUnitDefaultValue="mi"
          values={values}
          onCycleLengthInputChange={setCycleInput}
          onFieldChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
        />
      </div>
    </RoutineEditorPageBody>
  );
}

export function RoutineEditorCardsFixture({
  screen,
  expanded,
  duplicate,
}: {
  screen: "editor" | "new-day" | "new-routine";
  expanded: boolean;
  duplicate: boolean;
}) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <ScrollScreenWithBottomActions topChrome={<AppNav mode="topChrome" />}>
        <ContentRail className="space-y-3 pb-24 pt-4">
          {screen === "editor" ? <EditorFixture expanded={expanded} /> : null}
          {screen === "new-day" ? (
            <CreateRoutineDayClient
              routineId="r1"
              backHref="/dev/routine-editor-cards"
              routineEditHref="/dev/routine-editor-cards"
              days={DAYS}
              createRoutineDayAction={okAction}
            />
          ) : null}
          {screen === "new-routine" ? (
            <CreateRoutineClient
              backHref="/dev/routine-editor-cards"
              routines={ROUTINES}
              draftRoutineName="Hotel gym"
              duplicateRoutineAction={okAction}
              initialDuplicateExpanded={duplicate}
            />
          ) : null}
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
