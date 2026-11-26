"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { chooseTodayRoutineAction, type ChooseTodayRoutineResult } from "@/app/today/choose-routine-action";
import { StarterPlanCard, type StarterPlanCreateAction } from "@/app/today/StarterPlanCard";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { CardChip, CardChips, CardEmptyState, CardHeader, CardSurface, cardTokens } from "@/components/ui/card-system";
import { useToast } from "@/components/ui/ToastProvider";
import { isRedirectError } from "@/lib/next-navigation-errors";
import type { TodayNoRoutineState, TodayRoutineChoice } from "@/lib/start-fast-guards";

export type ChooseTodayRoutineAction = (routineId: string) => Promise<ChooseTodayRoutineResult>;

const CHOOSE_NETWORK_FAILED_MESSAGE = "Could not switch to that routine. Check your connection and try again.";
const CHOOSE_TOAST_ID = "today-choose-routine";

const quietLinkClassName = "inline-flex min-h-11 items-center px-2 text-sm font-medium text-[rgb(var(--text-secondary))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]";

/** "See all 5 routines" when some are not listed, else "All routines". */
export function formatTodayAllRoutinesLink(listedCount: number, moreCount: number) {
  return moreCount > 0 ? `See all ${listedCount + moreCount} routines` : "All routines";
}

/**
 * Routines exist but none is active (made with "Build my own", or the active one was archived): list the person's
 * own routines, newest first, and one tap makes that routine Today's. Never offers starter plans, so nothing new
 * is created by accident. Failures (open workout, Free limit, offline) use the in-flow notice.
 */
export function TodayPickRoutineCard({
  routines,
  moreCount,
  chooseAction = chooseTodayRoutineAction,
}: {
  routines: TodayRoutineChoice[];
  moreCount: number;
  chooseAction?: ChooseTodayRoutineAction;
}) {
  const router = useRouter();
  const toast = useToast();
  const pendingRef = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleChoose(routineId: string) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPendingId(routineId);
    let result: ChooseTodayRoutineResult;
    try {
      result = await chooseAction(routineId);
    } catch (error) {
      if (isRedirectError(error)) throw error;
      result = { ok: false, error: CHOOSE_NETWORK_FAILED_MESSAGE };
    }
    if (!result.ok) {
      pendingRef.current = false;
      setPendingId(null);
      toast.error(result.error, { id: CHOOSE_TOAST_ID });
      return;
    }
    // Stays pending until the refreshed Today replaces this card.
    router.refresh();
  }

  return (
    <section aria-labelledby="today-pick-routine-heading" className="space-y-3" data-today-pick-routine="true">
      <div className="space-y-1 px-1">
        <h2 id="today-pick-routine-heading" className="m-0 text-lg font-semibold text-[rgb(var(--text-primary))]">Pick a routine for Today</h2>
        <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">
          None of your routines is active. Tap one to follow it here.
        </p>
      </div>
      <ul className={cardTokens.list}>
        {routines.map((routine) => {
          const isPending = pendingId === routine.id;
          return (
            <li key={routine.id}>
              <CardSurface tone={isPending ? "current" : "neutral"} data-today-pick-routine-option={routine.id}>
                <CardHeader
                  title={routine.name}
                  headingLevel={3}
                  chips={(
                    <CardChips>
                      <CardChip tone={isPending ? "current" : "neutral"}>{isPending ? "Switching…" : "Use"}</CardChip>
                    </CardChips>
                  )}
                  interaction={{
                    kind: "press",
                    onPress: () => void handleChoose(routine.id),
                    disabled: pendingId !== null,
                    buttonProps: { "aria-label": `Use ${routine.name} on Today`, "aria-busy": isPending || undefined },
                  }}
                />
              </CardSurface>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-center gap-x-4">
        <Link href="/routines" className={quietLinkClassName}>{formatTodayAllRoutinesLink(routines.length, moreCount)}</Link>
      </div>
    </section>
  );
}

/** Unknown state, or workouts logged but no routines left: the plain "Choose a routine" card with a Routines link. */
export function TodayChooseRoutineCard() {
  return (
    <CardEmptyState
      title="Choose a routine"
      body="Pick the routine you want to follow, then today's plan shows here."
      action={(
        <Link href="/routines" className={getAppButtonClassName({ variant: "primary", fullWidth: true })}>
          Go to Routines
        </Link>
      )}
    />
  );
}

/**
 * What Today shows with no active routine, per resolveTodayNoRoutineState (start-fast-guards.ts): starter plans on
 * a true first run, plans plus "Restore a routine" when everything is archived, the person's own routines when one
 * just is not active, and the plain Routines card otherwise. `null` (not loaded) is the plain card, never plans.
 */
export function TodayNoRoutinePanel({
  state,
  createAction,
  chooseAction,
}: {
  state: TodayNoRoutineState | null;
  createAction?: StarterPlanCreateAction;
  chooseAction?: ChooseTodayRoutineAction;
}) {
  switch (state?.kind) {
    case "starters":
      return <StarterPlanCard createAction={createAction} />;
    case "starters-with-restore":
      return <StarterPlanCard createAction={createAction} variant="restore" />;
    case "pick-routine":
      return <TodayPickRoutineCard routines={state.routines} moreCount={state.moreCount} chooseAction={chooseAction} />;
    default:
      return <TodayChooseRoutineCard />;
  }
}
