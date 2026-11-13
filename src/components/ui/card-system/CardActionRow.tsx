import type { ReactNode } from "react";
import { getBottomActionButtonClassName, type BottomActionIntent } from "@/components/layout/bottomActionIntents";
import { cn } from "@/lib/cn";

export type CardActionIntent = "danger" | "neutral" | "toggle" | "primary";

/**
 * Card action intents map onto the dock's bottom-action chrome. `neutral` deliberately uses the full-strength
 * secondary look (`info`), not `toggleInactive`, whose 64% gold text measured 3.66:1 (below AA 4.5:1).
 */
const intentToBottomActionIntent: Record<CardActionIntent, BottomActionIntent> = {
  danger: "danger",
  neutral: "info",
  toggle: "toggleActive",
  primary: "positive",
};

export function getCardActionButtonClassName({
  intent = "neutral",
  divider = false,
  className,
}: {
  intent?: CardActionIntent;
  /** Draw a divider on the trailing edge (every action except the last). */
  divider?: boolean;
  className?: string;
}) {
  return getBottomActionButtonClassName({
    intent: intentToBottomActionIntent[intent],
    className: cn(
      "!h-11 !min-h-0 !rounded-none !border-0 !px-3",
      divider ? "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]" : undefined,
      className,
    ),
  });
}

/**
 * Action strip frame. It renders INSIDE the card surface as its last child (divider on top), so the surface keeps
 * its theme radius and clips the strip; nothing has to square off the card's bottom corners.
 */
export function CardActionFrame({
  columns,
  children,
  className,
  label = "Card actions",
}: {
  columns: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
  /** Accessible name of the action group. */
  label?: string;
}) {
  const gridClassName = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div
      data-card-actions="true"
      className={cn("border-t border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.16)]", className)}
    >
      <div role="group" aria-label={label} className={cn("grid min-h-11 overflow-hidden", gridClassName)}>
        {children}
      </div>
    </div>
  );
}

export type CardActionDefinition = {
  key: string;
  label: ReactNode;
  intent?: CardActionIntent;
  onPress: () => void;
  disabled?: boolean;
  /** Plain-text name for assistive tech. It must contain the visible label text (WCAG 2.5.3 label in name). */
  ariaLabel?: string;
};

/**
 * Action strip (always 44px buttons) shown inside an expanded card.
 * Order rule: destructive first (left), neutral/toggle next, primary last (right).
 * Destructive actions never live in a card corner; they sit here, behind the card's expand affordance.
 * Render it inside `CardSurface`, after the header and body.
 */
export function CardActionRow({
  actions,
  className,
  label,
}: {
  actions: CardActionDefinition[];
  className?: string;
  label?: string;
}) {
  if (actions.length === 0) {
    return null;
  }

  const columns = Math.min(actions.length, 3) as 1 | 2 | 3;

  return (
    <CardActionFrame columns={columns} className={className} label={label}>
      {actions.map((action, index) => (
        <button
          key={action.key}
          type="button"
          data-card-action={action.key}
          data-bottom-action-intent={intentToBottomActionIntent[action.intent ?? "neutral"]}
          aria-label={action.ariaLabel}
          disabled={action.disabled}
          onClick={action.onPress}
          className={getCardActionButtonClassName({ intent: action.intent, divider: index < actions.length - 1 })}
        >
          <span className="bottom-action__label">{action.label}</span>
        </button>
      ))}
    </CardActionFrame>
  );
}
