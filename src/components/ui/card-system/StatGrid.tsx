import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { normalizeDecoratedText } from "@/lib/text-separator-normalization";
import { cardTokens } from "@/components/ui/card-system/cardTokens";

export type StatGridTone = "default" | "success" | "danger" | "warning" | "muted";

export type StatGridItem = {
  label: string;
  value: string;
  /** Rich value (for example a coloured numerator). `value` is still the plain-text fallback and the sort key. */
  valueNode?: ReactNode;
  tone?: StatGridTone;
  /** Quiet lines under the value (delta, timeframe, trend). */
  meta?: string[];
  /** Direction of a change. Rendered as a glyph plus visually hidden text, so it never relies on colour. */
  direction?: "up" | "down" | "flat";
};

const toneClassNames: Record<StatGridTone, string> = {
  default: "text-[rgb(var(--text-primary)/0.98)]",
  success: "text-[rgb(var(--success-rgb)/0.96)]",
  danger: "text-[rgb(255,116,116)]",
  warning: "text-[rgb(var(--warning-rgb)/0.98)]",
  muted: "text-[rgb(var(--text-secondary)/0.9)]",
};

const directionGlyphs = {
  up: { glyph: "↑", text: "Up" },
  down: { glyph: "↓", text: "Down" },
  flat: { glyph: "→", text: "No change" },
} as const;

/** Values that carry several facts ("135 lbs | 5 reps") read better on their own row. */
const WIDE_VALUE_LENGTH = 22;

function toDisplayText(value: string) {
  return normalizeDecoratedText(value).replace(/\s+\|\s+/g, " · ").replace(/\s*->\s*/g, " → ");
}

/**
 * Summary stats as a wrapping grid: 11px eyebrow label, 14px semibold value, optional 12px meta lines.
 * It replaces the sideways stat rails (a horizontal scroller inside a card clipped values mid-word), so every
 * stat is always visible and the grid grows taller instead of wider. Rendered as a description list.
 */
export function StatGrid({ items, className }: { items: StatGridItem[]; className?: string }) {
  const visibleItems = items.filter((item) => item.value.trim().length > 0 || item.valueNode);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <dl data-card-stat-grid="true" className={cn("m-0 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-x-3 gap-y-3", className)}>
      {visibleItems.map((item, index) => {
        const direction = item.direction ? directionGlyphs[item.direction] : null;
        const isWide = toDisplayText(item.value).length > WIDE_VALUE_LENGTH;

        return (
          <div
            key={`${item.label}-${index}`}
            data-card-stat-item="true"
            className={cn("min-w-0 border-t border-[rgb(var(--border-strong)/0.16)] pt-2", isWide ? "col-span-full" : undefined)}
          >
            <dt className={cardTokens.statLabel}>{item.label}</dt>
            <dd className={cn("m-0 mt-1 min-w-0 text-sm font-semibold leading-snug [overflow-wrap:anywhere]", toneClassNames[item.tone ?? "default"])}>
              {direction ? (
                <>
                  <span aria-hidden="true" className="mr-1">{direction.glyph}</span>
                  <span className="sr-only">{direction.text} </span>
                </>
              ) : null}
              {item.valueNode ?? toDisplayText(item.value)}
              {item.meta && item.meta.length > 0 ? (
                <span className="mt-0.5 block text-xs font-medium leading-snug text-[rgb(var(--text-secondary)/0.92)]">
                  {item.meta.map((line) => toDisplayText(line)).join(" · ")}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
