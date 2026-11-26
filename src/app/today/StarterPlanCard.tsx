"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createStarterRoutineAction, type CreateStarterRoutineResult } from "@/app/routines/starter-actions";
import { getRoutineLimitNoticeCopy, isRoutineLimitError } from "@/app/routines/routine-copy";
import { CardChip, CardChips, CardHeader, CardMeta, CardSurface, cardTokens } from "@/components/ui/card-system";
import { useToast } from "@/components/ui/ToastProvider";
import { isRedirectError } from "@/lib/next-navigation-errors";
import { STARTER_TEMPLATES, type StarterTemplateId } from "@/lib/starter-templates";

export type StarterPlanCreateAction = (templateId: StarterTemplateId, deviceTimeZone?: string | null) => Promise<CreateStarterRoutineResult>;

const STARTER_NETWORK_FAILED_MESSAGE = "Could not set up that plan. Check your connection and try again.";
const STARTER_TOAST_ID = "starter-plan";

/** The device's IANA zone, so the new routine's Day 1 is today where the person is. */
function readDeviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** "3 days a week" chip text. */
export function formatStarterDaysChip(daysPerWeek: number) {
  return `${daysPerWeek} days a week`;
}

export type StarterPlanCreated = { routineId: string; activated: boolean };

/**
 * The three starter plans as tap targets. One tap creates the routine with its days and exercises; the server makes
 * it the active routine only when nothing live is active and no workout is open (start-fast-guards.ts). When it was
 * only added, the notice says so ("Added. Switch to it from Routines.") and `onCreated` gets `activated: false`, so
 * the caller can go to Routines instead of Today. `onCreated` decides where to go next.
 * A second tap while one is setting up is ignored (ref guard, then every card disables), and the server adopts an
 * identical routine made a moment ago, so a double tap makes one routine. Failures use the in-flow notice (toast).
 */
export function StarterPlanList({
  createAction = createStarterRoutineAction,
  onCreated,
  headingLevel = 3,
}: {
  createAction?: StarterPlanCreateAction;
  onCreated: (created: StarterPlanCreated) => void;
  headingLevel?: 2 | 3 | 4;
}) {
  const toast = useToast();
  const pendingRef = useRef(false);
  const [pendingId, setPendingId] = useState<StarterTemplateId | null>(null);

  async function handlePick(templateId: StarterTemplateId) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPendingId(templateId);
    let result: CreateStarterRoutineResult;
    try {
      result = await createAction(templateId, readDeviceTimeZone());
    } catch (error) {
      if (isRedirectError(error)) throw error;
      result = { ok: false, error: STARTER_NETWORK_FAILED_MESSAGE };
    }
    if (!result.ok) {
      pendingRef.current = false;
      setPendingId(null);
      toast.error(isRoutineLimitError(result.error) ? getRoutineLimitNoticeCopy() : result.error, { id: STARTER_TOAST_ID });
      return;
    }
    if (!result.activated && result.notice) {
      toast.success(result.notice, { id: STARTER_TOAST_ID });
    }
    // Stays pending (cards disabled) until the next screen replaces this one.
    onCreated({ routineId: result.routineId, activated: result.activated });
  }

  return (
    <ul className={cardTokens.list} data-starter-plan-list="true">
      {STARTER_TEMPLATES.map((template) => {
        const isPending = pendingId === template.id;
        return (
          <li key={template.id}>
            <CardSurface tone={isPending ? "current" : "neutral"} data-starter-plan={template.id}>
              <CardHeader
                title={template.name}
                headingLevel={headingLevel}
                meta={<CardMeta items={[template.summary]} />}
                chips={(
                  <CardChips>
                    <CardChip tone={isPending ? "current" : "neutral"}>
                      {isPending ? "Setting up…" : formatStarterDaysChip(template.daysPerWeek)}
                    </CardChip>
                  </CardChips>
                )}
                interaction={{
                  kind: "press",
                  onPress: () => void handlePick(template.id),
                  disabled: pendingId !== null,
                  buttonProps: { "aria-label": `Start ${template.title}`, "aria-busy": isPending || undefined },
                }}
              />
            </CardSurface>
          </li>
        );
      })}
    </ul>
  );
}

const quietLinkClassName = "inline-flex min-h-11 items-center px-2 text-sm font-medium text-[rgb(var(--text-secondary))] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]";

/**
 * Today with no routines at all: "Pick a plan to start", three plans, then two quiet links. Shown only on a true
 * first run (no routines, no finished workouts) or, as `variant="restore"`, when every routine is archived: then
 * the copy says so and "Restore a routine" (the Archived list on Routines) sits beside "Build my own".
 * TodayNoRoutinePanel picks the variant; people with live routines never see this card.
 */
export function StarterPlanCard({
  createAction,
  variant = "first-run",
}: {
  createAction?: StarterPlanCreateAction;
  variant?: "first-run" | "restore";
}) {
  const router = useRouter();
  const isRestore = variant === "restore";

  return (
    <section aria-labelledby="starter-plan-heading" className="space-y-3" data-starter-plan-card="true">
      <div className="space-y-1 px-1">
        <h2 id="starter-plan-heading" className="m-0 text-lg font-semibold text-[rgb(var(--text-primary))]">Pick a plan to start</h2>
        <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">
          {isRestore
            ? "Your routines are archived. Restore one, or pick a plan with today as Day 1."
            : "One tap sets it up with today as Day 1. You can change anything later."}
        </p>
      </div>
      <StarterPlanList
        createAction={createAction}
        onCreated={({ activated }) => (activated ? router.refresh() : router.push("/routines"))}
      />
      <div className="flex flex-wrap items-center justify-center gap-x-4">
        <Link href="/routines/new?mode=blank" className={quietLinkClassName}>Build my own</Link>
        {isRestore ? (
          <Link href="/routines" className={quietLinkClassName} data-starter-restore-link="true">Restore a routine</Link>
        ) : (
          <Link href="/routines" className={quietLinkClassName}>Your routines</Link>
        )}
      </div>
    </section>
  );
}
