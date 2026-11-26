"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { RoutineDuplicateChooserPanel } from "@/components/routines/RoutineChooserMenu";
import { RoutineDuplicateChooserListViewport } from "@/components/routines/RoutineDuplicateChooserListViewport";
import { WorkoutPlanChooserSourceCard } from "@/components/routines/WorkoutPlanChooserSourceCard";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { OptionSwitchRow } from "@/components/ui/measurements/OptionControls";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/ToastProvider";
import type { ActionResult } from "@/lib/action-result";
import { ROUTINE_COPY_NAME_MAX_LENGTH } from "@/lib/routine-copy-name";
import { getRoutineDayEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

type Props = {
  routineId: string;
  backHref: string;
  /** Kept for callers; the cycle-settings link card it fed is gone (SIMPLIFY #9). */
  routineEditHref?: string;
  days: WorkoutPlanSourceListItem[];
  createRoutineDayAction: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  populateRoutineDayFromSourceAction?: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  targetRoutineDayId?: string;
  targetDayEditHref?: string;
};

export function CreateRoutineDayClient({
  routineId,
  backHref,
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
  // Copying needs a source the server can read: the day itself or its template (both actions accept either).
  const hasCopySource = Boolean(selectedSource?.sourceRoutineDayId || selectedSource?.workoutPlanTemplateId);
  const canCreate = isTargetMode ? hasCopySource : creationMode === "blank" || hasCopySource;
  // One plain verb on the primary (SIMPLIFY #9); copying into an existing day keeps its own verb.
  const primaryLabel = isTargetMode ? "Copy Day" : "Create";

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
                  // The name is optional in both cases; a copied day keeps its source name when it is blank.
                  formData.set("name", name.trim());
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
              } catch {
                // A thrown action (network, server crash) never shows its raw message.
                toast.error(isTargetMode || creationMode === "duplicate"
                  ? "Could not copy the day. Check your connection and try again."
                  : "Could not create the day. Check your connection and try again.");
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
        // Add a day with one short sheet (SIMPLIFY #9): Name (optional), Start from, Rest day, Create.
        <div className="space-y-3" data-create-day-sheet="">
          <FormField label="Day name" helper="Optional. Leave blank to use the day number.">
            {(control) => (
              <input
                {...control}
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, ROUTINE_COPY_NAME_MAX_LENGTH))}
                placeholder="Legs, Push, Hotel Gym..."
                className={formFieldControlClassName}
                maxLength={ROUTINE_COPY_NAME_MAX_LENGTH}
              />
            )}
          </FormField>

          {days.length > 0 ? (
            <div className="space-y-1.5" data-create-day-start-from="">
              <p className="px-1 text-[0.85rem] font-semibold text-[rgb(var(--text-secondary))]">Start from</p>
              <SegmentedControl
                ariaLabel="Start from"
                size="sm"
                value={creationMode}
                options={[
                  { label: "Empty", value: "blank" },
                  { label: "Copy a day", value: "duplicate" },
                ]}
                onChange={(next) => setCreationMode(next === "duplicate" ? "duplicate" : "blank")}
              />
            </div>
          ) : null}

          {creationMode === "blank" ? (
            <div data-create-day-rest-toggle={isRest ? "on" : "off"}>
              <OptionSwitchRow
                label="Rest day"
                hint={isRest ? "No exercises. You can switch it back later." : "Off: a training day."}
                checked={isRest}
                onCheckedChange={setIsRest}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {(isTargetMode || creationMode === "duplicate") && days.length > 0 ? (
        <RoutineDuplicateChooserPanel
          title={isTargetMode ? "Choose Day" : "Copy which day?"}
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

    </div>
  );
}
