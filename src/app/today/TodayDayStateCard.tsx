import type { ReactNode } from "react";
import { CardChip, CardSurface, cardTokens, type CardChipTone, type CardHeadingLevel, type CardTone } from "@/components/ui/card-system";

export type TodayDayStateTone = "warning" | "blocking" | "neutral";

/**
 * Tone is a rail and ring on the card surface, always paired with text: the heading, and for warning and
 * blocking a status chip ("Partial", "Can't start"), so colour is never the only signal. There is no danger
 * rail in `cardSemanticTones.ts`; blocking uses the attention rail plus a danger chip.
 */
const toneConfig: Record<TodayDayStateTone, { cardTone: CardTone; chip?: { tone: CardChipTone; label: string } }> = {
  warning: { cardTone: "attention", chip: { tone: "attention", label: "Partial" } },
  blocking: { cardTone: "attention", chip: { tone: "danger", label: "Can't start" } },
  neutral: { cardTone: "neutral" },
};

/**
 * Day state message on the card surface: a heading, plain body text, a status chip for warning and blocking.
 * Today day picker only (partial or invalid day, no scheduled workout). The day editor keeps `DayDetailStateCard`,
 * which the frozen design-system contract test ties to the `detailState*` tokens (routine editor lane).
 */
export function TodayDayStateCard({
  title,
  body,
  tone = "neutral",
  headingLevel = 2,
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  tone?: TodayDayStateTone;
  headingLevel?: CardHeadingLevel;
  className?: string;
}) {
  const config = toneConfig[tone];
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <CardSurface tone={config.cardTone} className={className} data-today-day-state-card={tone}>
      <div className="grid gap-1.5 px-4 py-3">
        <Heading className={cardTokens.title}>{title}</Heading>
        {config.chip ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <CardChip tone={config.chip.tone}>{config.chip.label}</CardChip>
          </div>
        ) : null}
        <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">{body}</p>
      </div>
    </CardSurface>
  );
}
