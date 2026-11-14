"use client";

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
import { CardChips, CardHeader, CardMeta, CardStatusChip, CardSurface } from "@/components/ui/card-system";
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
      : "Create Day";

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
                    : { ok: false, error: "Could not duplicate day." }
                  : await createRoutineDayAction(formData);
                if (!result.ok) {
                  toast.error(result.error ?? (isTargetMode ? "Could not duplicate day." : "Could not create day."));
                  return;
                }
                if (!result.routineDayId) {
                  toast.error(isTargetMode
                    ? "Day was duplicated without a destination."
                    : "New day was created without a destination.");
                  return;
                }

                toast.success(isTargetMode
                  ? "Day copied into this day."
                  : creationMode === "duplicate"
                    ? "Day duplicated."
                    : "Day created.");
                router.push(isTargetMode
                  ? (targetDayEditHref ?? getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)))
                  : getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)));
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not complete the day action.");
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
              title="Blank day"
              kind="select"
              active={creationMode === "blank"}
              onPress={() => setCreationMode("blank")}
            />
            <RoutineChooserOptionCard
              title="Duplicate day"
              kind="toggle"
              active={creationMode === "duplicate"}
              disabled={days.length === 0}
              onPress={days.length > 0 ? () => {
                setCreationMode("duplicate");
              } : undefined}
            />
          </div>

          {creationMode === "blank" ? (
            <CardSurface as="section" aria-labelledby="create-day-setup-title">
              <CardHeader headingLevel={2} title={<span id="create-day-setup-title">Day setup</span>} />
              <div className="space-y-3 px-4 pb-4">
                <label className="block">
                  <span className="block text-sm font-semibold text-[rgb(var(--text-primary))]">
                    Day name
                  </span>
                  <span className="block pt-0.5 text-xs text-[rgb(var(--text-secondary)/0.86)]">
                    Optional. Leave blank to use the day number.
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value.slice(0, ROUTINE_COPY_NAME_MAX_LENGTH))}
                    placeholder="Legs, Push, Hotel Gym..."
                    className="mt-2 min-h-11 w-full rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2.5 text-sm text-[rgb(var(--text-primary))] outline-none transition focus:border-[rgb(var(--accent)/0.34)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]"
                    maxLength={ROUTINE_COPY_NAME_MAX_LENGTH}
                  />
                </label>
              </div>
            </CardSurface>
          ) : null}

          {creationMode === "blank" ? (
            <CardSurface tone={isRest ? "attention" : "neutral"} data-create-day-rest-toggle={isRest ? "on" : "off"}>
              <CardHeader
                headingLevel={3}
                title="Make this a rest day"
                meta={(
                  <CardMeta
                    items={[isRest
                      ? "Created as a rest day. You can switch it back later."
                      : "Off: a training day. Add exercises in the day editor."]}
                  />
                )}
                chips={isRest ? <CardChips><CardStatusChip status="rest" /></CardChips> : undefined}
                interaction={{
                  kind: "select",
                  selected: isRest,
                  onSelect: () => setIsRest((current) => !current)
                }}
              />
            </CardSurface>
          ) : null}
        </>
      ) : null}

      {(isTargetMode || creationMode === "duplicate") && days.length > 0 ? (
        <RoutineDuplicateChooserPanel
          title="Choose Day"
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
        <CardSurface>
          <CardHeader
            headingLevel={3}
            title="Manage cycle settings"
            meta={<CardMeta items={["Adjust cycle length, start anchor and progression defaults before you add the next day or duplicate a day into a different cycle position."]} />}
            interaction={{ kind: "link", href: routineEditHref }}
          />
        </CardSurface>
      ) : null}
    </div>
  );
}
