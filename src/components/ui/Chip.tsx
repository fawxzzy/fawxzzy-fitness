import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { HIT_AREA_CLASS_NAME, HIT_AREA_WIDE_CLASS_NAME } from "@/components/ui/hitArea";
import { cn } from "@/lib/cn";

// The ONE chip family (docs/ui/FOUNDATION.md "Chips"). Two shapes, one tone vocabulary:
// - `Chip` (variant "badge", the default): a status/meta badge. variant "label": the small uppercase pill.
//   Pass `onRemove` for a removable filter chip (a real 44px remove button).
// - `ChipButton`: a tappable 44px pill for filters and quick picks; `selected` marks it on and sets aria-pressed.
// Old names stay as thin wrappers with identical markup: AppBadge = Chip, Pill = Chip variant="label",
// PillButton = ChipButton, CardChip (card-system) = Chip with the card status tones.

export type ChipToneCanonical = "neutral" | "accent" | "success" | "attention" | "danger";
/** Legacy aliases: default=neutral, today/current=accent, warning=attention, destructive=danger. */
export type ChipToneLegacy = "default" | "today" | "current" | "warning" | "destructive";
export type ChipTone = ChipToneCanonical | ChipToneLegacy;
export type ChipVariant = "badge" | "label";

export function normalizeChipTone(tone: ChipTone = "neutral"): ChipToneCanonical {
  switch (tone) {
    case "default":
      return "neutral";
    case "today":
    case "current":
      return "accent";
    case "warning":
      return "attention";
    case "destructive":
      return "danger";
    default:
      return tone;
  }
}

const BADGE_TONE_CLASS_NAMES: Record<ChipToneCanonical, string> = {
  neutral: appTokens.defaultBadge,
  accent: appTokens.todayBadge,
  success: appTokens.successBadge,
  attention: appTokens.warningBadge,
  danger: appTokens.destructiveBadge,
};

const LABEL_BASE_CLASS_NAME =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]";
const LABEL_SELECTED_CLASS_NAME = "border-[rgb(var(--accent)/0.36)] bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--text-primary))]";
const LABEL_TONE_CLASS_NAMES: Record<ChipToneCanonical, string> = {
  neutral: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.9)] text-[rgb(var(--text-primary)/0.88)]",
  accent: LABEL_SELECTED_CLASS_NAME,
  success: "border-[rgb(var(--success-rgb)/0.32)] bg-[rgb(var(--success-rgb)/0.14)] text-[rgb(var(--text-primary))]",
  attention: "border-[rgb(var(--warning-rgb)/0.34)] bg-[rgb(var(--warning-rgb)/0.14)] text-[rgb(255_242_220)]",
  danger: "border-[rgb(var(--danger-rgb)/0.22)] bg-[rgb(var(--surface-3-rgb)/0.92)] text-[rgb(var(--danger-rgb)/0.96)]",
};

const BUTTON_BASE_CLASS_NAME =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]";
const BUTTON_SELECTED_CLASS_NAME = "border-[rgb(var(--accent)/0.38)] bg-[rgb(var(--accent)/0.16)] text-[rgb(var(--text-primary))]";
const BUTTON_HOVER_CLASS_NAME =
  "hover:border-[rgb(var(--border-strong)/0.28)] hover:bg-[rgb(var(--surface-2)/0.98)] hover:text-[rgb(var(--text-primary))]";

const REMOVE_BUTTON_CLASS_NAME = cn(
  HIT_AREA_WIDE_CLASS_NAME,
  "-my-1 -mr-1.5 ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-current opacity-80 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
);

/** Class list for a chip; exported so non-React surfaces (and tests) can share it. */
export function getChipClassName({
  variant = "badge",
  tone = "neutral",
  selected = false,
  className,
}: {
  variant?: ChipVariant;
  tone?: ChipTone;
  selected?: boolean;
  className?: string;
}) {
  const canonicalTone = normalizeChipTone(tone);
  if (variant === "label") {
    return cn(LABEL_BASE_CLASS_NAME, selected ? LABEL_SELECTED_CLASS_NAME : LABEL_TONE_CLASS_NAMES[canonicalTone], className);
  }
  return cn(appTokens.badgeBase, BADGE_TONE_CLASS_NAMES[selected ? "accent" : canonicalTone], className);
}

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: ChipTone;
  variant?: ChipVariant;
  /** Accent "on" look (label variant). */
  selected?: boolean;
  /** Makes it a removable chip: renders a 44px-target remove button after the text. */
  onRemove?: () => void;
  /** Accessible name of the remove button; defaults to "Remove <text>" when children is a string. */
  removeLabel?: string;
};

export function Chip({ children, tone = "neutral", variant = "badge", selected = false, onRemove, removeLabel, className, ...props }: ChipProps) {
  const resolvedRemoveLabel = removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove");
  return (
    <span className={getChipClassName({ variant, tone, selected, className })} {...props}>
      {children}
      {onRemove ? (
        <button type="button" aria-label={resolvedRemoveLabel} className={REMOVE_BUTTON_CLASS_NAME} onClick={onRemove} data-chip-remove="">
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4l8 8" />
            <path d="M12 4l-8 8" />
          </svg>
        </button>
      ) : null}
    </span>
  );
}

export type ChipButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  tone?: ChipTone;
  /** Legacy name for `selected` (no aria-pressed, as before). */
  active?: boolean;
  /** Toggle chip: accent "on" look and aria-pressed. */
  selected?: boolean;
  /** Keep the visible pill small and pad the 44px target with an invisible layer (isolated pills only). */
  hitSlop?: boolean;
};

/**
 * Tappable pill. The default is a real 44px-tall control (`min-h-11`), which is the only version that is safe inside
 * horizontal filter rails (the rail clips overflow) and wrapped rows (a neighbour's hit layer would overlap). Pass
 * `hitSlop` only for an isolated pill whose visible shape must stay small; it pads the target with an invisible layer.
 */
export function ChipButton({ tone = "neutral", active, selected, hitSlop = false, className, type = "button", ...props }: ChipButtonProps) {
  const isOn = Boolean(selected ?? active);
  return (
    <button
      type={type}
      aria-pressed={selected === undefined ? undefined : selected}
      className={cn(
        hitSlop ? HIT_AREA_CLASS_NAME : "min-h-11",
        BUTTON_BASE_CLASS_NAME,
        isOn ? BUTTON_SELECTED_CLASS_NAME : cn(LABEL_TONE_CLASS_NAMES[normalizeChipTone(tone)], BUTTON_HOVER_CLASS_NAME),
        className,
      )}
      {...props}
    />
  );
}
