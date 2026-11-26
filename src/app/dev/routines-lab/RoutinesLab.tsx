"use client";

import { AppTabBarPreview } from "@/components/AppTabBar";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { RoutinesPageClient } from "@/app/routines/RoutinesPageClient";
import { RoutineHomeClient } from "@/app/routines/RoutineHomeClient";
import type { ActionResult } from "@/lib/action-result";

export type RoutinesLabState =
  | "list"
  | "list-empty"
  | "list-create"
  | "list-create-duplicate"
  | "list-archived"
  | "list-archived-open"
  | "list-archived-limit"
  | "list-empty-archived"
  | "detail"
  | "detail-add-day";

const previewDays = [
  { id: "p1", dayIndex: 1, title: "Hunt", weekdayLabel: "Mon", isRest: false, exerciseCount: 8 },
  { id: "p2", dayIndex: 2, title: "Forge", weekdayLabel: "Tue", isRest: false, exerciseCount: 8 },
  { id: "p3", dayIndex: 3, title: "Rest", weekdayLabel: "Wed", isRest: true, exerciseCount: 0 },
];

const routines = [
  {
    id: "routine-1",
    name: "Atlas Routine",
    summaryParts: ["16 exercises", "4 train", "1 rest"],
    href: "/dev/routines-lab?state=detail",
    isActive: true,
    createdAt: "2026-11-05T12:00:00Z",
    previewDays,
  },
  {
    id: "routine-2",
    name: "Atlas Hypertrophy",
    summaryParts: ["14 exercises", "4 train", "0 rest"],
    href: "/dev/routines-lab?state=detail",
    isActive: false,
    createdAt: "2026-10-12T12:00:00Z",
    previewDays: previewDays.slice(0, 2),
  },
];

const thirdRoutine = {
  id: "routine-3",
  name: "Atlas Conditioning",
  summaryParts: ["9 exercises", "3 train", "2 rest"],
  href: "/dev/routines-lab?state=detail",
  isActive: false,
  createdAt: "2026-09-02T12:00:00Z",
  previewDays: previewDays.slice(0, 3),
};

const archivedRoutines = [
  { id: "routine-archived-1", name: "Summer Cut 2026", archivedLabel: "Archived Nov 24" },
  { id: "routine-archived-2", name: "Atlas Strength Block With A Long Name", archivedLabel: "Archived Oct 3" },
];

const days = [
  { id: "rd-1", dayIndex: 1, title: "Push", isRest: false, exerciseSummary: "3 strength • 1 cardio", notes: null, href: "#", isToday: false, isCompleted: true, isInSession: false, loggedSetCount: 0 },
  { id: "rd-2", dayIndex: 2, title: "Lower A", isRest: false, exerciseSummary: "2 strength • 1 cardio", notes: null, href: "#", isToday: true, isCompleted: false, isInSession: false, loggedSetCount: 0 },
  { id: "rd-3", dayIndex: 3, title: "Recovery", isRest: true, exerciseSummary: "Recovery and mobility only", notes: null, href: "#", isToday: false, isCompleted: false, isInSession: false, loggedSetCount: 0 },
];

export function RoutinesLab({ state, fail, hang }: { state: RoutinesLabState; fail: boolean; hang: boolean }) {
  // One fake for every action: waits a beat (forever with ?hang=1), then succeeds or fails (?fail=1).
  async function fake(message: string): Promise<ActionResult> {
    if (hang) await new Promise(() => {});
    await new Promise((resolve) => setTimeout(resolve, 350));
    return fail ? { ok: false, error: message } : { ok: true };
  }
  const duplicateRoutineAction = async (formData: FormData): Promise<ActionResult & { routineId?: string }> => {
    // The real duplicateRoutineAction auto-suffixes a taken name. The duplicate-name error users see comes from the
    // client pre-check in CreateRoutineClient (duplicateNameConflict), so the lab rejects the two seeded names to
    // exercise the same notice slot.
    const name = String(formData.get("name") ?? formData.get("newRoutineName") ?? "").trim().toLowerCase();
    if (name === "atlas routine" || name === "atlas hypertrophy") {
      return { ok: false, error: "Routine name already exists." };
    }
    const result = await fake("Could not create the routine.");
    return result.ok ? { ok: true, routineId: "routine-new" } : result;
  };

  if (state === "detail" || state === "detail-add-day") {
    return (
      <MainTabScreen topNavMode="none" ambientPreset="viewDay">
        <AppTabBarPreview pathname="/routines/lab" />
        <ScrollScreenWithBottomActions
          floatingHeader={(
            <ScreenHeader
              kind="detail"
              title="Atlas Routine"
              back={<ScreenHeaderBackButton href="/dev/routines-lab?state=list" label="Back to routines" />}
              trailing={<AppBadge tone="success">Active</AppBadge>}
            />
          )}
        >
          <ContentRail className="space-y-3">
            <p data-routine-cycle-summary="true" className="px-1 text-[13px] text-[rgb(var(--text-secondary)/0.9)]">
              3 days
            </p>
            <RoutineHomeClient
              routineId="routine-1"
              routineStartDate="2026-04-21"
              isActiveRoutine
              appendRoutineDayAction={() => fake("Could not add the day.")}
              createRoutineDayAction={() => fake("Could not add the day.")}
              deleteRoutineDayAction={() => fake("A routine must keep at least one day.")}
              reorderRoutineDaysAction={() => fake("Could not reorder days.")}
              workoutPlanSources={[]}
              initialAddDayMenuOpen={state === "detail-add-day"}
              days={days}
            />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }

  const listedRoutines = state === "list-empty" || state === "list-empty-archived"
    ? []
    : state === "list-archived-limit"
      ? [...routines, thirdRoutine]
      : routines;
  const showArchived = state === "list-archived"
    || state === "list-archived-open"
    || state === "list-archived-limit"
    || state === "list-empty-archived";

  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <AppTabBarPreview pathname="/routines" />
      <ScrollScreenWithBottomActions
        floatingHeader={<ScreenHeader kind="tab" title="Routines" />}
      >
        <ContentRail className="space-y-3">
          <RoutinesPageClient
            newRoutineHref="/routines/new"
            routines={listedRoutines}
            duplicateRoutineAction={duplicateRoutineAction}
            setActiveRoutineAction={() => fake("Could not set the active routine.")}
            archiveRoutineAction={() => fake("Could not archive the routine. Try again.")}
            restoreRoutineAction={() => fake("Could not restore the routine. Try again.")}
            archivedRoutines={showArchived ? archivedRoutines : []}
            accessState="free"
            initialArchivedExpanded={state === "list-archived-open" || state === "list-archived-limit" || state === "list-empty-archived"}
            initialCreateRoutineOpen={state === "list-create" || state === "list-create-duplicate"}
            initialCreateRoutineDuplicateExpanded={state === "list-create-duplicate"}
          />
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
