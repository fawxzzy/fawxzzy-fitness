"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import {
  RoutineChooserOptionCard,
  RoutineDuplicateChooserPanel,
} from "@/components/routines/RoutineChooserMenu";
import { RoutineDuplicateChooserListViewport } from "@/components/routines/RoutineDuplicateChooserListViewport";
import { WorkoutPlanChooserSourceCard } from "@/components/routines/WorkoutPlanChooserSourceCard";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { useToast } from "@/components/ui/ToastProvider";
import type { ActionResult } from "@/lib/action-result";
import { ROUTINE_COPY_NAME_MAX_LENGTH } from "@/lib/routine-copy-name";
import { getRoutineDayEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

type Props = {
  routineId: string;
  backHref: string;
  routineEditHref: string;
  days: WorkoutPlanSourceListItem[];
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
  const [selectedSourceId, setSelectedSourceId] = useState<string>(days[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedSource = useMemo(
    () => days.find((day) => day.id === selectedSourceId) ?? null,
    [days, selectedSourceId],
  );
  const canCreate = isTargetMode
    ? Boolean(selectedSource?.workoutPlanTemplateId)
    : creationMode === "blank" || Boolean(selectedSource?.workoutPlanTemplateId);
  const primaryLabel = isTargetMode
    ? "Confirm"
    : creationMode === "duplicate"
      ? "Confirm"
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
              try {
                const formData = new FormData();
                formData.set("routineId", routineId);
                if (isTargetMode) {
                  formData.set("targetRoutineDayId", targetRoutineDayId ?? "");
                } else {
                  formData.set("creationMode", creationMode);
                  if (creationMode === "blank") {
                    formData.set("name", name.trim());
                  }
                  if (creationMode === "blank" && isRest) {
                    formData.set("isRest", "on");
                  }
                }

                if ((isTargetMode || creationMode === "duplicate") && selectedSource) {
                  if (selectedSource.workoutPlanTemplateId) {
                    formData.set("workoutPlanTemplateId", selectedSource.workoutPlanTemplateId);
                  }
                  if (selectedSource.sourceRoutineDayId) {
                    formData.set("sourceRoutineDayId", selectedSource.sourceRoutineDayId);
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
                    ? "Workout plan created from template."
                    : "Workout plan created.");
                router.push(isTargetMode
                  ? (targetDayEditHref ?? getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)))
                  : getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not complete the workout plan action.");
              }
            });
          }}
        >
          {isPending ? (isTargetMode ? "Duplicating..." : "Creating...") : primaryLabel}
        </BottomDockButton>
      )}
    />
  ), [backHref, canCreate, createRoutineDayAction, creationMode, isPending, isRest, isTargetMode, name, populateRoutineDayFromSourceAction, primaryLabel, routineId, router, selectedSource, targetDayEditHref, targetRoutineDayId, toast]);

  usePublishBottomActions(actionsNode);

  return (
    <div className="space-y-3">
      {!isTargetMode ? (
        <>
          <div className="space-y-2">
            <RoutineChooserOptionCard
              title="Blank workout plan"
              active={creationMode === "blank"}
              rightSlot={<ChevronRightIcon className="h-4 w-4" />}
              onPress={() => setCreationMode("blank")}
            />
            <RoutineChooserOptionCard
              title="Duplicate workout plan"
              active={creationMode === "duplicate"}
              disabled={days.length === 0}
              rightSlot={creationMode === "duplicate" ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              onPress={days.length > 0 ? () => {
                setCreationMode("duplicate");
              } : undefined}
            />
          </div>

          <div className="rounded-[1rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.78)]">
              Workout Plan Setup
            </p>
            {creationMode === "blank" ? (
              <label className="block pt-3">
                <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">
                  Workout plan name
                </span>
                <span className="block pt-0.5 text-xs text-[rgb(var(--text-secondary)/0.86)]">
                  Optional for blank workout plans.
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, ROUTINE_COPY_NAME_MAX_LENGTH))}
                  placeholder="Legs, Push, Hotel Gym..."
                  className="mt-2 w-full rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[rgb(var(--accent)/0.34)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]"
                  maxLength={ROUTINE_COPY_NAME_MAX_LENGTH}
                />
              </label>
            ) : null}

            {creationMode === "blank" ? (
              <button
                type="button"
                onClick={() => setIsRest((current) => !current)}
                className={`mt-3 flex min-h-11 w-full items-center justify-between rounded-[0.9rem] border px-3 py-2.5 text-left transition ${isRest
                  ? "border-[rgb(var(--accent-yellow-on)/0.26)] bg-[rgb(var(--accent-yellow-off)/0.12)]"
                  : "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.6)]"}`}
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
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {(isTargetMode || creationMode === "duplicate") && days.length > 0 ? (
        <RoutineDuplicateChooserPanel
          title="Choose Workout Plan"
          list={(
                  <RoutineDuplicateChooserListViewport scrollClassName="max-h-[min(22rem,46dvh)]">
                    {days.map((day) => (
                      <WorkoutPlanChooserSourceCard
                        key={day.id}
                        onPress={() => {
                          setSelectedSourceId(day.id);
                        }}
                        selected={selectedSourceId === day.id}
                        source={{
                          dayIndex: day.dayIndex,
                          title: day.title,
                          occurrenceWeekday: day.weekdayLabel,
                          isRest: day.isRest,
                          splitSummary: day.splitSummary,
                          recapExercises: day.recapExercises,
                        }}
                      />
                    ))}
                  </RoutineDuplicateChooserListViewport>
          )}
          footer={undefined}
        />
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
          <span aria-hidden="true">{"\u203A"}</span>
        </Link>
      ) : null}
    </div>
  );
}
