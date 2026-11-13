import type { ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

/** Status vocabulary shared by every card. Colour tones map onto the existing Chip tones. */
export type CardChipTone = "neutral" | "current" | "success" | "attention" | "danger";

const chipToneByCardTone = {
  neutral: "default",
  current: "today",
  success: "success",
  attention: "warning",
  danger: "destructive",
} as const;

export const CARD_CHIP_CLASS_NAME = "px-2.5 py-1";

/**
 * Status chip. Text is always rendered (ACTIVE, TODAY, REST...) and an optional `glyph` adds a
 * second non-colour cue (for example a check mark for DONE).
 */
export function CardChip({
  tone = "neutral",
  glyph,
  children,
  className,
}: {
  tone?: CardChipTone;
  glyph?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Chip tone={chipToneByCardTone[tone]} data-card-chip={tone} className={cn(CARD_CHIP_CLASS_NAME, className)}>
      {glyph ? <span aria-hidden="true" className="mr-1">{glyph}</span> : null}
      {children}
    </Chip>
  );
}

/** Canonical status chips so every surface spells and tones them identically. */
export const cardStatusChips = {
  active: { tone: "success", label: "Active" },
  today: { tone: "current", label: "Today" },
  inSession: { tone: "success", label: "In session" },
  done: { tone: "success", label: "Done", glyph: "✓" },
  skipped: { tone: "attention", label: "Skipped", glyph: "⊘" },
  rest: { tone: "attention", label: "Rest" },
  optional: { tone: "neutral", label: "Optional" },
  selected: { tone: "current", label: "Selected" },
} as const satisfies Record<string, { tone: CardChipTone; label: string; glyph?: string }>;

export type CardStatusChipKey = keyof typeof cardStatusChips;

export function CardStatusChip({ status, className }: { status: CardStatusChipKey; className?: string }) {
  const chip = cardStatusChips[status];
  const glyph = "glyph" in chip ? chip.glyph : undefined;

  return (
    <CardChip tone={chip.tone} glyph={glyph} className={className}>
      {chip.label}
    </CardChip>
  );
}

export function CardChips({ children, flush = false, className }: { children: ReactNode; /** Drop the default top margin. */ flush?: boolean; className?: string }) {
  return <div data-card-chips="true" className={cn(cardTokens.chips, flush ? undefined : "mt-1.5", className)}>{children}</div>;
}
