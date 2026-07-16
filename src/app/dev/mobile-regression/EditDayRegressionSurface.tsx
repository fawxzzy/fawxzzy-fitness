"use client";

import { useState } from "react";
import { ReorderExerciseRow } from "@/app/routines/[id]/edit/day/[dayId]/ReorderExerciseRow";
import { RoutineDayKindSelector, type RoutineDayKind } from "@/components/routines/RoutineDayKindSelector";
import { DayDetailExerciseList, type DayDetailExerciseListItem } from "@/components/routines/day-detail/DayDetailExerciseList";
import { appTokens } from "@/components/ui/app/tokens";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { SharedExerciseGoalForm } from "@/components/ui/measurements/SharedExerciseGoalForm";
import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { ReorderHandleGlyph } from "@/components/ui/ReorderHandleGlyph";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { cn } from "@/lib/cn";
import { resolveEditDayExercisePreview, type EditDayExerciseDraft } from "@/lib/edit-day-exercise-draft";
import { resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import { createProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";

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
  intent: "toggleInactive",
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
  const [reviewDayKind, setReviewDayKind] = useState<RoutineDayKind>("optional");
  const [expandedId, setExpandedId] = useState<string | null>(fixture === "edit-exercise" ? exercises[0]?.id ?? null : null);
  const activeExercise = expandedId ? exercises.find((exercise) => exercise.id === expandedId) ?? null : null;
  const activeDraft: EditDayExerciseDraft | null = fixture === "edit-exercise" && activeExercise
    ? {
      ...createProgressionPlaybookFormState(),
      goalState,
      manualOrder: "1",
      modality: resolveInlineModality(activeExercise.measurementType ?? "reps", activeExercise.equipment ?? null, activeExercise.name),
    }
    : null;
  const renderMockReorderHandle = (exerciseName: string) => (
    <button
      type="button"
      aria-label={`Reorder ${exerciseName}`}
      title="Drag to reorder"
      className={cn(
        appTokens.routineEditorReorderHandle,
        "absolute right-[0.22rem] top-[0.12rem]",
        "z-[2] h-7 w-7 rounded-[0.72rem] border-[rgb(var(--selection-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.08),rgb(var(--surface-1-rgb)/0.36))] text-[rgb(var(--text-primary)/0.94)] shadow-[0_0_0_1px_rgb(var(--selection-rgb)/0.06),0_0_16px_rgb(var(--selection-rgb)/0.12)]",
      )}
      >
        <ReorderHandleGlyph className={appTokens.routineEditorHandleGlyph} />
      </button>
  );

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
      {fixture === "default" ? (
        <section className="rounded-[1.15rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.48)] px-3 py-3" data-routine-day-kind-review="true">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold text-[rgb(var(--text-primary))]">Day type</h2>
            <span className="text-[11px] font-medium text-[rgb(var(--accent-strong))]">{reviewDayKind}</span>
          </div>
          <RoutineDayKindSelector value={reviewDayKind} onChange={setReviewDayKind} />
          <p className="mt-2.5 text-[12px] leading-5 text-[rgb(var(--text-secondary)/0.88)]">
            {reviewDayKind === "optional"
              ? "Optional workouts stay available to log. Skipping one does not affect your required plan."
              : reviewDayKind === "required"
                ? "Required workouts count toward your plan and are marked missed when their planned day passes."
                : "Rest days are excluded from planned workout statistics."}
          </p>
        </section>
      ) : null}
      <DayDetailExerciseList
        mode="editable"
        items={items}
        showOrderBadges={false}
        activeItemId={expandedId}
        onInfoItem={() => {}}
        renderOverlayActions={(item) => expandedId === item.id ? null : renderMockReorderHandle(item.name)}
        onSelectItem={fixture === "default" ? undefined : (item) => setExpandedId((current) => current === item.id ? null : item.id)}
        renderExpandedContent={(item) => {
          if (fixture !== "edit-exercise" || expandedId !== item.id) return null;
          return (
            <div className={appTokens.routineEditorCompactStack}>
              <AttachedCardActionStripFrame gridClassName="grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]">
                  <button type="button" data-bottom-action-intent="toggleInactive" className={cn(INLINE_VIEW_ACTION_BUTTON_CLASS_NAME, "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]")}>
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
