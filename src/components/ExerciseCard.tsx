import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

type ExerciseCardVariant = "compact" | "interactive" | "expanded" | "summary";
type ExerciseCardState = "default" | "selected" | "active" | "completed" | "empty";

const defaultChevron = <span aria-hidden="true" className="text-muted">›</span>;

const variantClassNames: Record<ExerciseCardVariant, string> = {
  compact: "min-h-[5rem] px-4 py-3.5",
  interactive: "min-h-[5rem] px-3.5 py-3.5",
  expanded: "min-h-[5.1rem] px-3.5 py-3.5",
  summary: "min-h-[6rem] px-3.5 py-3.5",
};

const stateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] hover:border-border/70 hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
  selected: "border-accent/35 bg-accent/10 shadow-[0_10px_28px_-18px_rgba(96,200,130,0.95)] ring-1 ring-accent/20 hover:border-accent/45 hover:bg-accent/12",
  active: "border-white/12 bg-[rgb(var(--surface-rgb)/0.72)] hover:border-white/16 hover:bg-[rgb(var(--surface-rgb)/0.8)]",
  completed: "border-emerald-400/20 bg-emerald-400/8 hover:border-emerald-400/25 hover:bg-emerald-400/10",
  empty: "border-border/35 bg-[rgb(var(--surface-2-soft)/0.5)] hover:border-border/45 hover:bg-[rgb(var(--surface-2-soft)/0.58)]",
};

const badgeStateClassNames: Record<ExerciseCardState, string> = {
  default: "border-border/45 bg-surface/45 text-muted",
  selected: "border-accent/30 bg-accent/18 text-text",
  active: "border-white/12 bg-white/8 text-white/88",
  completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  empty: "border-border/35 bg-surface/35 text-muted",
};

export function ExerciseCard({
  title,
  subtitle,
  children,
  leadingVisual,
  onPress,
  rightIcon = defaultChevron,
  actions,
  badgeText,
  disabled = false,
  className,
  trailingClassName,
  variant = "interactive",
  state = "default",
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  leadingVisual?: ReactNode;
  onPress?: () => void;
  rightIcon?: ReactNode;
  actions?: ReactNode;
  badgeText?: string;
  disabled?: boolean;
  className?: string;
  trailingClassName?: string;
  variant?: ExerciseCardVariant;
  state?: ExerciseCardState;
}) {
  const bodyContent = (
    <>
      {leadingVisual ? <div className="shrink-0 self-start pt-0.5">{leadingVisual}</div> : null}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="min-w-0 text-[0.98rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)] [overflow-wrap:anywhere]">
              {title}
            </p>
            {subtitle ? <p className={cn("min-w-0 text-xs leading-snug whitespace-normal break-words", appTokens.metaText)}>{subtitle}</p> : null}
          </div>
          {badgeText ? (
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none", badgeStateClassNames[state])}>
              {badgeText}
            </span>
          ) : null}
        </div>
        {children}
      </div>
      {rightIcon ? <div className={cn("shrink-0 self-center text-sm font-medium leading-none text-[rgb(var(--text)/0.82)]", trailingClassName)}>{rightIcon}</div> : null}
    </>
  );

  const baseClassName = cn(
    "flex w-full items-start justify-between gap-3 rounded-[1.25rem] border text-left",
    variantClassNames[variant],
    stateClassNames[state],
    onPress ? appTokens.rowInteractive : undefined,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  const bodyClassName = "min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25";

  if (onPress && actions) {
    return (
      <article className={cn(baseClassName, "items-stretch gap-2") }>
        <button
          type="button"
          className={cn(bodyClassName, "min-w-0 flex-1")}
          onClick={onPress}
          disabled={disabled}
        >
          {bodyContent}
        </button>
        <div className="flex shrink-0 items-start gap-1.5">{actions}</div>
      </article>
    );
  }

  if (onPress) {
    return (
      <button
        type="button"
        className={cn(baseClassName, bodyClassName)}
        onClick={onPress}
        disabled={disabled}
      >
        {bodyContent}
      </button>
    );
  }

  return <div className={baseClassName}>{bodyContent}</div>;
}
