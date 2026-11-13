"use client";

import type { ReactNode } from "react";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import {
  CardChip,
  CardChips,
  CardHeader,
  CardMeta,
  CardSurface,
  StatBlock,
  type CardChipTone,
  type CardHeadingLevel,
  type CardTone,
} from "@/components/ui/card-system";
import { toHistoryMetaText } from "@/components/history/historyStats";
import { cn } from "@/lib/cn";

const HISTORY_EXERCISE_THUMB_SIZE = 56;

/** Signal codes the History screens build (`PR`, `PROMO`, `REG`...) spelled out as chips, in fixed tones. */
const SIGNAL_CHIPS: Record<string, { label: string; tone: CardChipTone }> = {
  PR: { label: "PR", tone: "success" },
  BEST: { label: "Best", tone: "success" },
  PROMO: { label: "Promotion", tone: "success" },
  REG: { label: "Regression", tone: "attention" },
  WATCH: { label: "Watch", tone: "attention" },
  MANUAL: { label: "Manual", tone: "neutral" },
};

export function resolveHistorySignalChip(code: string): { label: string; tone: CardChipTone } {
  const normalized = code.trim();
  return SIGNAL_CHIPS[normalized.toUpperCase()] ?? { label: normalized, tone: "neutral" };
}

export type HistoryExerciseVisual = {
  name: string;
  slug?: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
};

/**
 * Exercise row for History (session detail rows and the exercise browser), on the card system.
 *
 *   [thumb]  Exercise name                                 [chevron]
 *            3/4 sets - Quads - Squat
 *            TOP SET
 *            225 lbs x 5
 *            [PR] [Best]
 *   (optional) body: StatGrid, trend, bullet sections
 *
 * `onPress` makes the header the control: a toggle (down chevron, aria-expanded) when `interaction` is
 * `toggle` (session detail rows expand in place), a press (right chevron) when it opens another screen (the
 * browser opens the exercise info sheet). Without `onPress` the card is static. Signals are chips; facts
 * (counts, timers, rest, ranks) are meta, so every signal and fact is visible at once (they used to rotate).
 */
export function HistoryDetailExerciseCard({
  exercise,
  summary,
  summaryLabel,
  metaItems = [],
  factItems = [],
  signalCodes = [],
  tone = "neutral",
  expanded = false,
  interaction = "toggle",
  onPress,
  controlsId,
  showLeadingVisual = true,
  headingLevel = 2,
  body,
  dataSurface = "history-detail",
  density = "compact",
  className,
}: {
  exercise: HistoryExerciseVisual;
  /** Target-style line under the title, for example `225 lbs x 5`. Hidden when empty. */
  summary?: string;
  summaryLabel?: string;
  /** Facts joined by a dot, for example the set count and muscle. */
  metaItems?: string[];
  /** A second meta line (browser: rank, sessions, PRs, last performed). */
  factItems?: string[];
  /** Signal codes turned into status chips (`PR`, `BEST`, `PROMO`, `REG`, `WATCH`, `MANUAL`). */
  signalCodes?: string[];
  tone?: CardTone;
  expanded?: boolean;
  interaction?: "toggle" | "press";
  onPress?: () => void;
  controlsId?: string;
  showLeadingVisual?: boolean;
  headingLevel?: CardHeadingLevel;
  /** Content under the header inside the surface (browser detailed view). */
  body?: ReactNode;
  dataSurface?: string;
  /** `data-history-density` marker (the History QA script and tests key on it). */
  density?: "compact" | "detailed";
  className?: string;
}) {
  const visibleMeta = metaItems.filter(Boolean);
  const visibleFacts = factItems.filter(Boolean);
  const hasSummary = Boolean(summary && summary.trim().length > 0);
  const signalChips = [...new Set(signalCodes.map((code) => code.trim()).filter(Boolean))].map(resolveHistorySignalChip);

  return (
    <CardSurface
      tone={interaction === "toggle" && expanded ? "current" : tone}
      className={className}
      data-history-card="detail-exercise"
      data-history-surface={dataSurface}
      data-history-density={density}
      data-history-expanded={expanded ? "true" : "false"}
    >
      <CardHeader
        headingLevel={headingLevel}
        title={exercise.name}
        meta={visibleMeta.length > 0 || visibleFacts.length > 0 ? (
          <>
            <CardMeta items={visibleMeta} />
            <CardMeta items={visibleFacts} />
          </>
        ) : undefined}
        chips={signalChips.length > 0 ? (
          <CardChips>
            {signalChips.map((chip) => <CardChip key={chip.label} tone={chip.tone}>{chip.label}</CardChip>)}
          </CardChips>
        ) : undefined}
        details={hasSummary ? <StatBlock label={summaryLabel || "Summary"} values={[toHistoryMetaText(summary ?? "")]} /> : undefined}
        leading={showLeadingVisual ? (
          <ExerciseThumb
            exercise={exercise}
            size={HISTORY_EXERCISE_THUMB_SIZE}
            intent="row-card"
            layout="inline"
            sizes={`${HISTORY_EXERCISE_THUMB_SIZE}px`}
          />
        ) : undefined}
        interaction={onPress
          ? (interaction === "toggle"
            ? { kind: "toggle", expanded, onToggle: onPress, controlsId }
            : { kind: "press", onPress })
          : { kind: "none" }}
      />
      {body ? <div className={cn("border-t border-[rgb(var(--border-strong)/0.14)] px-4 pb-4 pt-3")}>{body}</div> : null}
    </CardSurface>
  );
}
