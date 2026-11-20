import Link from "next/link";
import { CardSurface, cardTokens } from "@/components/ui/card-system";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";

/**
 * The three quiet Today states share ONE card (Zac 2026-11-19): a centred decorative mark, a centred title, no
 * second line, and at most one centred action that opens the right editor.
 *   - "empty":      No exercises planned  -> [Edit day]      (Edit Day editor, /routines/[id]/edit/day/[dayId])
 *   - "rest":       Rest day              -> no action
 *   - "noSchedule": No scheduled workout  -> [Edit routine]  (routine editor, /routines/[id]/edit)
 * Dashed card-system surface, no rail (DESIGN-CONTRACT 8.2). The title is the meaning; the mark is aria-hidden,
 * and rest uses the attention (amber) colour only alongside its words (C3).
 */
export type TodayEmptyDayKind = "empty" | "rest" | "noSchedule";

export const TODAY_EMPTY_DAY_COPY = {
  empty: { title: "No exercises planned", actionLabel: "Edit day" },
  rest: { title: "Rest day", actionLabel: null },
  noSchedule: { title: "No scheduled workout", actionLabel: "Edit routine" },
} as const satisfies Record<TodayEmptyDayKind, { title: string; actionLabel: string | null }>;

function TodayEmptyDayMark({ kind }: { kind: TodayEmptyDayKind }) {
  const tint = kind === "rest"
    ? "text-[rgb(var(--warning-rgb)/0.92)] bg-[rgb(var(--warning-rgb)/0.1)] border-[rgb(var(--warning-rgb)/0.28)]"
    : "text-[rgb(var(--accent)/0.92)] bg-[rgb(var(--accent)/0.1)] border-[rgb(var(--accent)/0.26)]";

  return (
    <span
      aria-hidden="true"
      data-today-empty-mark={kind}
      className={cn("mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border", tint)}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {kind === "rest" ? (
          // Crescent moon.
          <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />
        ) : kind === "empty" ? (
          // Empty list: three short rows.
          <>
            <path d="M8 7h10" />
            <path d="M8 12h10" />
            <path d="M8 17h6" />
            <path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" strokeWidth="2.5" />
          </>
        ) : (
          // Calendar page.
          <>
            <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
            <path d="M8 3.5v4M16 3.5v4M4 10h16" />
          </>
        )}
      </svg>
    </span>
  );
}

export function TodayEmptyDayCard({
  kind,
  actionHref,
  headingLevel = 2,
  className,
}: {
  kind: TodayEmptyDayKind;
  /** Where the single action goes. Ignored for "rest"; when missing, the card shows no action. */
  actionHref?: string | null;
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const copy = TODAY_EMPTY_DAY_COPY[kind];
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const showAction = Boolean(copy.actionLabel && actionHref);

  return (
    <CardSurface
      empty
      showRail={false}
      tone={kind === "rest" ? "attention" : "neutral"}
      data-card-empty="true"
      data-today-empty-day={kind}
      className={className}
    >
      <div className="grid justify-items-center gap-3 px-4 py-5 text-center">
        <TodayEmptyDayMark kind={kind} />
        <Heading className={cn(cardTokens.title, "text-center")}>{copy.title}</Heading>
        {showAction && actionHref ? (
          <Link
            href={actionHref}
            className={getAppButtonClassName({ variant: "secondary", size: "sm", className: "min-w-[9.5rem]" })}
            data-today-empty-action={kind}
          >
            {copy.actionLabel}
          </Link>
        ) : null}
      </div>
    </CardSurface>
  );
}
