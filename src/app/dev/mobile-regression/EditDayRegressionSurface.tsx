"use client";

import { useState } from "react";
import { ReorderExerciseRow } from "@/app/routines/[id]/edit/day/[dayId]/ReorderExerciseRow";
import { DayDetailExerciseList, type DayDetailExerciseListItem } from "@/components/routines/day-detail/DayDetailExerciseList";
import { appTokens } from "@/components/ui/app/tokens";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { SharedExerciseGoalForm } from "@/components/ui/measurements/SharedExerciseGoalForm";
import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { cn } from "@/lib/cn";
import { resolveEditDayExercisePreview, type EditDayExerciseDraft } from "@/lib/edit-day-exercise-draft";
import { resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";

type EditDayFixture = "default" | "reorder" | "empty" | "edit-exercise" | "add-exercise" | "card-parity";

type EditDayExercise = {
  id: string;
  name: string;
  summary: string | null;
  iconSrc: string;
  orderNumber: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
};

function buildGoalState(): ExerciseGoalFormState {
  return {
    sets: "4",
    repsMin: "8",
    repsMax: "10",
    failure: false,
    weight: "70",
    duration: "",
    distance: "",
    calories: "",
    weightUnit: "lbs",
    distanceUnit: "mi",
    measurements: ["reps", "weight"],
  };
}

function resolveInlineModality(
  measurementType: "reps" | "time" | "distance" | "time_distance" | "none",
  equipment: string | null,
  name?: string | null,
): GoalModality {
  return resolveGoalModality({ measurementType: measurementType === "none" ? "reps" : measurementType, equipment, name, tags: undefined });
}

const INLINE_VIEW_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleActive",
});

const INLINE_DELETE_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "danger",
});

export function EditDayRegressionSurface({
  fixture,
  exercises,
}: {
  fixture: EditDayFixture;
  exercises: EditDayExercise[];
}) {
  const [goalState, setGoalState] = useState<ExerciseGoalFormState>(buildGoalState);
  const [expandedId, setExpandedId] = useState<string | null>(fixture === "edit-exercise" ? exercises[0]?.id ?? null : null);
  const activeExercise = expandedId ? exercises.find((exercise) => exercise.id === expandedId) ?? null : null;
  const activeDraft: EditDayExerciseDraft | null = fixture === "edit-exercise" && activeExercise
    ? {
      goalState,
      manualOrder: "1",
      modality: resolveInlineModality(activeExercise.measurementType ?? "reps", activeExercise.equipment ?? null, activeExercise.name),
    }
    : null;

  if (fixture === "empty") {
    return (
      <DayDetailStateCard
        tone="neutral"
        title="No exercises planned"
        body="Add an exercise to start building this day."
      />
    );
  }

  if (fixture === "reorder") {
    return (
      <ul className="space-y-2">
        {exercises.map((exercise, index) => (
          <li key={exercise.id} className={appTokens.routineEditorReorderItem}>
            <ReorderExerciseRow
              exerciseId={exercise.id}
              exerciseName={exercise.name}
              metadata={exercise.summary ?? "Goal missing"}
              measurementType={exercise.measurementType}
              primary_muscle={exercise.primary_muscle}
              equipment={exercise.equipment}
              movement_pattern={exercise.movement_pattern}
              isCardio={exercise.isCardio}
              kind={exercise.kind}
              type={exercise.type}
              image_icon_path={exercise.iconSrc}
              orderNumber={index + 1}
              isDragging={index === 0}
              onHandlePointerDown={() => {}}
              onHandlePointerMove={() => {}}
              onHandlePointerUp={() => {}}
              onHandlePointerCancel={() => {}}
            />
          </li>
        ))}
      </ul>
    );
  }

  if (fixture === "card-parity") {
    const parityExercise = exercises[2] ?? exercises[0];

    if (!parityExercise) {
      return (
        <DayDetailStateCard
          tone="neutral"
          title="Parity audit unavailable"
          body="Add an exercise fixture to compare view, edit, and reorder rows."
        />
      );
    }

    return (
      <div className="space-y-3" data-mobile-regression-card-parity="true">
        <div className="space-y-1.5" data-mobile-regression-card-mode="view">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.92)]">View Day</p>
          <DayDetailExerciseList
            mode="read_only"
            items={[{
              id: parityExercise.id,
              name: parityExercise.name,
              summary: parityExercise.summary,
              orderNumber: parityExercise.orderNumber,
              measurementType: parityExercise.measurementType,
              primary_muscle: parityExercise.primary_muscle,
              equipment: parityExercise.equipment,
              movement_pattern: parityExercise.movement_pattern,
              isCardio: parityExercise.isCardio,
              kind: parityExercise.kind,
              type: parityExercise.type,
              image_icon_path: parityExercise.iconSrc,
            }]}
          />
        </div>

        <div className="space-y-1.5" data-mobile-regression-card-mode="edit">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.92)]">Edit Day</p>
          <DayDetailExerciseList
            mode="editable"
            items={[{
              id: parityExercise.id,
              name: parityExercise.name,
              summary: parityExercise.summary,
              orderNumber: parityExercise.orderNumber,
              measurementType: parityExercise.measurementType,
              primary_muscle: parityExercise.primary_muscle,
              equipment: parityExercise.equipment,
              movement_pattern: parityExercise.movement_pattern,
              isCardio: parityExercise.isCardio,
              kind: parityExercise.kind,
              type: parityExercise.type,
              image_icon_path: parityExercise.iconSrc,
            }]}
          />
        </div>

        <div className="space-y-1.5" data-mobile-regression-card-mode="reorder">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.92)]">Reorder</p>
            <ReorderExerciseRow
              exerciseId={parityExercise.id}
              exerciseName={parityExercise.name}
              metadata={parityExercise.summary ?? "Goal missing"}
              measurementType={parityExercise.measurementType}
              primary_muscle={parityExercise.primary_muscle}
              equipment={parityExercise.equipment}
              movement_pattern={parityExercise.movement_pattern}
              isCardio={parityExercise.isCardio}
              kind={parityExercise.kind}
              type={parityExercise.type}
              image_icon_path={parityExercise.iconSrc}
              orderNumber={parityExercise.orderNumber}
              isDragging={false}
            onHandlePointerDown={() => {}}
            onHandlePointerMove={() => {}}
            onHandlePointerUp={() => {}}
            onHandlePointerCancel={() => {}}
          />
        </div>
      </div>
    );
  }

  const visibleExercises = exercises;

  const items: DayDetailExerciseListItem[] = visibleExercises.map((exercise) => ({
    ...resolveEditDayExercisePreview({
      savedSummary: exercise.summary ?? "Goal missing",
      savedOrderNumber: exercise.orderNumber,
      draft: fixture === "edit-exercise" && expandedId === exercise.id ? activeDraft : null,
      listLength: exercises.length,
    }),
    id: exercise.id,
    name: exercise.name,
    measurementType: exercise.measurementType,
    primary_muscle: exercise.primary_muscle,
    equipment: exercise.equipment,
    movement_pattern: exercise.movement_pattern,
    isCardio: exercise.isCardio,
    kind: exercise.kind,
    type: exercise.type,
    image_icon_path: exercise.iconSrc,
  }));

  return (
    <div className="space-y-3">
      <DayDetailExerciseList
        mode="editable"
        items={items}
        showOrderBadges={false}
        activeItemId={expandedId}
        onSelectItem={fixture === "default" ? undefined : (item) => setExpandedId((current) => current === item.id ? null : item.id)}
        renderExpandedContent={(item) => {
          if (fixture !== "edit-exercise" || expandedId !== item.id) return null;
          return (
            <div className={appTokens.routineEditorCompactStack}>
              <AttachedCardActionStripFrame gridClassName="grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]">
                  <button type="button" className={cn(INLINE_VIEW_ACTION_BUTTON_CLASS_NAME, "!border-r !border-r-[rgb(var(--border-strong)/0.18)]")}>
                    <span className="bottom-action__label">View</span>
                  </button>
                  <button type="button" data-bottom-action-intent="danger" className={INLINE_DELETE_ACTION_BUTTON_CLASS_NAME}>
                    <span className="bottom-action__label">Delete</span>
                  </button>
              </AttachedCardActionStripFrame>
              <div className="pt-[2px]">
                <SharedExerciseGoalForm
                  modality="strength"
                  state={goalState}
                  onStateChange={setGoalState}
                  names={{
                    sets: "targetSets",
                    repsMin: "targetRepsMin",
                    repsMax: "targetRepsMax",
                    weight: "targetWeight",
                    duration: "targetDuration",
                    distance: "targetDistance",
                    calories: "targetCalories",
                    weightUnit: "targetWeightUnit",
                    distanceUnit: "targetDistanceUnit",
                  }}
                  emptySummaryLabel="Goal missing"
                  hideSummary
                  measurementLayoutMode="horizontal-scroll"
                />
              </div>
            </div>
          );
        }}
      />

      {fixture === "add-exercise" ? (
        <div className="rounded-[1.25rem] border border-dashed border-border/45 bg-[rgb(var(--surface-2-soft)/0.38)] px-4 py-4 text-sm text-[rgb(var(--text-muted)/0.92)]">
          Add Exercise stays in the same screen family. The list remains visible, the dock still clears content, and the next step opens the picker without changing chrome.
        </div>
      ) : null}
    </div>
  );
}
