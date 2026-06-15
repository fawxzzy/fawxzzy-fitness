"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { buildRoutineSplitParts, renderSignatureParts } from "@/components/day-list/RoutineDayCardPresentation";
import {
  RoutinesCardList,
  RoutinesListItem,
  RoutinesListItemCard,
  RoutinesPageScaffold,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { getRoutineDayEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";

type ExistingRoutineDayItem = {
  id: string;
  sourceRoutineId: string;
  sourceRoutineName: string;
  isCurrentRoutine: boolean;
  dayIndex: number;
  title: string;
  weekdayLabel: string;
  isRest: boolean;
  splitSummary?: {
    total: number;
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  previewExercises?: Array<{
    id: string;
    name: string;
    goalLine?: string | null;
  }>;
  remainingExerciseCount?: number;
};

type Props = {
  routineId: string;
  backHref: string;
  routineEditHref: string;
  days: ExistingRoutineDayItem[];
  createRoutineDayAction: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  populateRoutineDayFromSourceAction?: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  targetRoutineDayId?: string;
  targetDayEditHref?: string;
};

export function CreateRoutineDayClient({
  routineId,
  backHref,
  routineEditHref,
  days,
  createRoutineDayAction,
  populateRoutineDayFromSourceAction,
  targetRoutineDayId,
  targetDayEditHref,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const isTargetMode = Boolean(targetRoutineDayId);
  const [creationMode, setCreationMode] = useState<"blank" | "duplicate">("blank");
  const [name, setName] = useState("");
  const [isRest, setIsRest] = useState(false);
  const [selectedSourceDayId, setSelectedSourceDayId] = useState<string>(days[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const currentRoutineSourceDays = useMemo(
    () => days.filter((day) => day.isCurrentRoutine),
    [days],
  );
  const otherRoutineSourceDays = useMemo(
    () => days.filter((day) => !day.isCurrentRoutine),
    [days],
  );

  const canCreate = isTargetMode ? selectedSourceDayId.length > 0 : creationMode === "blank" || selectedSourceDayId.length > 0;
  const primaryLabel = isTargetMode
    ? "Use Workout Plan"
    : creationMode === "duplicate"
      ? "Create From Workout Plan"
      : "Create Workout Plan";

  const actionsNode = useMemo(() => (
    <BottomActionSplit
      secondary={(
        <BottomDockLink href={backHref} intent="toggleActive">
          Back
        </BottomDockLink>
      )}
      primary={(
        <BottomDockButton
          type="button"
          intent="positive"
          disabled={!canCreate || isPending}
          onClick={() => {
            startTransition(async () => {
              const formData = new FormData();
              formData.set("routineId", routineId);
              if (isTargetMode) {
                formData.set("targetRoutineDayId", targetRoutineDayId ?? "");
                formData.set("sourceRoutineDayId", selectedSourceDayId);
              } else {
                formData.set("creationMode", creationMode);
                formData.set("name", name.trim());
                if (creationMode === "blank" && isRest) {
                  formData.set("isRest", "on");
                }
                if (creationMode === "duplicate") {
                  formData.set("sourceRoutineDayId", selectedSourceDayId);
                }
              }

              const result: ActionResult & { routineDayId?: string } = isTargetMode
                ? populateRoutineDayFromSourceAction
                  ? await populateRoutineDayFromSourceAction(formData)
                  : { ok: false, error: "Could not duplicate workout plan." }
                : await createRoutineDayAction(formData);
              if (!result.ok) {
                toast.error(result.error ?? (isTargetMode ? "Could not duplicate workout plan." : "Could not create workout plan."));
                return;
              }
              if (!result.routineDayId) {
                toast.error(isTargetMode
                  ? "Workout plan was duplicated without a destination."
                  : "New workout plan was created without a destination.");
                return;
              }

              toast.success(isTargetMode
                ? "Workout plan duplicated into this day."
                : creationMode === "duplicate"
                  ? "Workout plan created from existing plan."
                  : "Workout plan created.");
              router.push(isTargetMode
                ? (targetDayEditHref ?? getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)))
                : getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)));
            });
          }}
        >
          {isPending ? (isTargetMode ? "Duplicating..." : "Creating...") : primaryLabel}
        </BottomDockButton>
      )}
    />
  ), [backHref, canCreate, createRoutineDayAction, creationMode, isPending, isRest, isTargetMode, name, populateRoutineDayFromSourceAction, primaryLabel, routineId, router, selectedSourceDayId, targetDayEditHref, targetRoutineDayId, toast]);

  usePublishBottomActions(actionsNode);

  const renderSourceDaySummary = (day: ExistingRoutineDayItem) => {
    if (day.isRest) {
      return ["Recovery slot"];
    }

    if (day.splitSummary) {
      return [
        `${day.splitSummary.total} ${day.splitSummary.total === 1 ? "exercise" : "exercises"}`,
        ...buildRoutineSplitParts(day.splitSummary),
      ];
    }

    return ["No exercises"];
  };

  return (
    <RoutinesPageScaffold>
      <SharedDayListSection>
        <div className="space-y-3">
          {!isTargetMode ? (
            <>
              <RoutinesCardList>
                <RoutinesListItem>
                  <RoutinesListItemCard
                    title="Blank workout plan"
                    subtitle="Start fresh, choose a name, and set this workout plan up in the workout-plan editor."
                    subtitleTone="plain"
                    onPress={() => setCreationMode("blank")}
                    state={creationMode === "blank" ? "selected" : "default"}
                    rightIcon={creationMode === "blank" ? <AppBadge tone="today">SELECTED</AppBadge> : undefined}
                    bodyClassName="min-h-[5.15rem] py-[0.72rem]"
                    contentClassName="gap-1.5 py-0"
                    variant="standard"
                  />
                </RoutinesListItem>
                <RoutinesListItem>
                  <RoutinesListItemCard
                    title="Duplicate existing workout plan"
                    subtitle={days.length > 0
                      ? "Use a workout plan from this routine or another routine as the starting point for the next workout-plan slot."
                      : "Create at least one workout plan before duplicating from an existing plan."}
                    subtitleTone="plain"
                    onPress={days.length > 0 ? () => setCreationMode("duplicate") : undefined}
                    state={creationMode === "duplicate" ? "selected" : "default"}
                    rightIcon={creationMode === "duplicate" ? <AppBadge tone="today">SELECTED</AppBadge> : undefined}
                    className={days.length === 0 ? "opacity-70" : undefined}
                    bodyClassName="min-h-[5.15rem] py-[0.72rem]"
                    contentClassName="gap-1.5 py-0"
                    variant="standard"
                  />
                </RoutinesListItem>
              </RoutinesCardList>

              <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.78)]">
                  Workout Plan Setup
                </p>
                <label className="block pt-3">
                  <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">
                    Workout plan name
                  </span>
                  <span className="block pt-0.5 text-xs text-[rgb(var(--text-secondary)/0.86)]">
                    Optional. Leave blank to keep the default cycle-slot label.
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value.slice(0, 15))}
                    placeholder={creationMode === "duplicate" ? "Keep duplicated name" : "Legs, Push, Hotel Gym..."}
                    className="mt-2 w-full rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[rgb(var(--accent)/0.34)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]"
                    maxLength={15}
                  />
                </label>

                {creationMode === "blank" ? (
                  <button
                    type="button"
                    onClick={() => setIsRest((current) => !current)}
                    className={cn(
                      "mt-3 flex min-h-11 w-full items-center justify-between rounded-[0.9rem] border px-3 py-2.5 text-left transition",
                      isRest
                        ? "border-[rgb(var(--accent-yellow-on)/0.26)] bg-[rgb(var(--accent-yellow-off)/0.12)]"
                        : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.6)]",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">
                        {isRest ? "Rest workout plan enabled" : "Training plan"}
                      </span>
                      <span className="block pt-0.5 text-xs text-[rgb(var(--text-secondary)/0.84)]">
                        {isRest
                          ? "Create this workout-plan slot as a rest workout plan first. You can switch it back later."
                          : "Start with a normal training workout plan and add exercises in the workout-plan editor."}
                      </span>
                    </span>
                    <AppBadge tone={isRest ? "warning" : "default"}>
                      {isRest ? "REST" : "TRAIN"}
                    </AppBadge>
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {(isTargetMode || creationMode === "duplicate") && days.length > 0 ? (
            <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.78)]">
                Choose Source Workout Plan
              </p>
              <div className="space-y-3 pt-3">
                {currentRoutineSourceDays.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.74)]">
                      This routine
                    </p>
                    {currentRoutineSourceDays.map((day) => (
                      <SourceRoutineDayCard
                        key={day.id}
                        day={day}
                        isSelected={selectedSourceDayId === day.id}
                        onPress={() => setSelectedSourceDayId(day.id)}
                        renderSourceDaySummary={renderSourceDaySummary}
                      />
                    ))}
                  </div>
                ) : null}

                {otherRoutineSourceDays.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.74)]">
                      Other routines
                    </p>
                    {otherRoutineSourceDays.map((day) => (
                      <SourceRoutineDayCard
                        key={day.id}
                        day={day}
                        isSelected={selectedSourceDayId === day.id}
                        onPress={() => setSelectedSourceDayId(day.id)}
                        renderSourceDaySummary={renderSourceDaySummary}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!isTargetMode ? (
            <Link
              href={routineEditHref}
              className="flex min-h-11 items-center justify-between rounded-[1rem] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.62)] px-3 py-3 text-sm font-medium text-[rgb(var(--text-primary))]"
            >
              <span>
                <span className="block">Manage cycle settings</span>
                <span className="block pt-0.5 text-xs font-normal text-[rgb(var(--text-secondary)/0.84)]">
                  Adjust cycle length, start anchor, and progression defaults before you create the next workout-plan slot or duplicate a plan into a different cycle position.
                </span>
              </span>
              <span aria-hidden="true" className={appTokens.metaText}>{"\u203A"}</span>
            </Link>
          ) : null}
        </div>
      </SharedDayListSection>
    </RoutinesPageScaffold>
  );
}

function SourceRoutineDayCard(args: {
  day: ExistingRoutineDayItem;
  isSelected: boolean;
  onPress: () => void;
  renderSourceDaySummary: (day: ExistingRoutineDayItem) => string[];
}) {
  const { day, isSelected, onPress, renderSourceDaySummary } = args;

  return (
    <RoutinesListItemCard
      onPress={onPress}
      title={day.title}
      subtitle={renderSignatureParts(renderSourceDaySummary(day))}
      subtitleTone="plain"
      state={isSelected ? "selected" : "default"}
      rightIcon={isSelected ? <AppBadge tone="today">SOURCE</AppBadge> : undefined}
      bodyClassName="min-h-[7.1rem] py-[0.72rem]"
      contentClassName="gap-1.5 py-0"
      className={day.isRest ? "border-[rgb(var(--accent-yellow-on)/0.22)] bg-[rgb(var(--accent-yellow-off)/0.1)]" : undefined}
      variant="standard"
    >
      <div className="grid gap-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.76)]">
              {day.isCurrentRoutine ? "This routine" : day.sourceRoutineName} / {day.weekdayLabel} / Cycle Slot {day.dayIndex}
            </p>
            {day.isRest ? <AppBadge tone="warning">REST</AppBadge> : null}
          </div>
          {day.isRest ? (
            <div className="rounded-[0.95rem] border border-[rgb(var(--accent-yellow-on)/0.22)] bg-[rgb(var(--accent-yellow-off)/0.12)] px-3 py-2.5">
              <p className="text-[11px] leading-[1.35] text-[rgb(var(--text-secondary)/0.88)]">
                Keep this recovery workout plan as-is, then fine-tune it in the workout-plan editor after the duplicate is created.
              </p>
            </div>
          ) : day.previewExercises?.length ? (
            <div className="grid gap-2 rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-3 py-2.5">
              {day.previewExercises.map((exercise) => (
                <div key={exercise.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.82rem] font-semibold text-[rgb(var(--text-primary))]">
                      {exercise.name}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] leading-[1.3] text-[rgb(var(--text-secondary)/0.84)]">
                      {exercise.goalLine?.trim() || "Goal missing"}
                    </p>
                  </div>
                </div>
              ))}
              {day.remainingExerciseCount && day.remainingExerciseCount > 0 ? (
                <p className="text-[11px] leading-[1.3] text-[rgb(var(--text-secondary)/0.82)]">
                  +{day.remainingExerciseCount} more {day.remainingExerciseCount === 1 ? "exercise" : "exercises"} in this workout plan.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[0.95rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.56)] px-3 py-2.5">
              <p className="text-[11px] leading-[1.35] text-[rgb(var(--text-secondary)/0.86)]">
                No exercises yet. Duplicate this workout plan if you want the same cycle position and naming without any planned work attached.
              </p>
            </div>
          )}
      </div>
    </RoutinesListItemCard>
  );
}
