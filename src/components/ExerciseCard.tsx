import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

const defaultChevron = <span aria-hidden="true" className="text-muted">›</span>;

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
}) {
  const bodyContent = (
    <>
      {leadingVisual ? <div className="shrink-0 self-start">{leadingVisual}</div> : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-[1rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)] [overflow-wrap:anywhere]">
            {title}
          </p>
          {badgeText ? (
            <span className="shrink-0 rounded-full border border-border/45 bg-surface/45 px-2 py-0.5 text-[10px] font-medium text-muted">
              {badgeText}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className={cn("min-w-0 text-xs leading-snug whitespace-normal break-words", appTokens.metaText)}>{subtitle}</p> : null}
        {children}
      </div>
      {rightIcon ? <div className={cn("shrink-0 self-center text-sm font-medium leading-none text-[rgb(var(--text)/0.82)]", trailingClassName)}>{rightIcon}</div> : null}
    </>
  );

  const baseClassName = cn(
    "flex w-full items-start justify-between gap-3 text-left",
    appTokens.rowBase,
    appTokens.rowDefault,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  const bodyClassName = cn(
    "min-w-0 flex-1",
    onPress ? appTokens.rowInteractive : undefined,
  );

  if (onPress && actions) {
    return (
      <article className={cn(baseClassName, "items-stretch gap-2") }>
        <button
          type="button"
          className={cn(bodyClassName, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25")}
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
        className={cn(baseClassName, bodyClassName, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25")}
        onClick={onPress}
        disabled={disabled}
      >
        {bodyContent}
      </button>
    );
  }

  return <div className={baseClassName}>{bodyContent}</div>;
}
