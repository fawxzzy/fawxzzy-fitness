import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { appTokens } from "@/components/ui/app/tokens";

const defaultChevron = <span aria-hidden="true" className="text-muted">›</span>;

export function ExerciseCard({
  title,
  subtitle,
  onPress,
  rightIcon = defaultChevron,
  badgeText,
  disabled = false,
  className,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightIcon?: ReactNode;
  badgeText?: string;
  disabled?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[0.96rem] font-semibold leading-snug text-[rgb(var(--text)/0.98)] [overflow-wrap:anywhere]">
            {title}
          </p>
          {badgeText ? (
            <span className="shrink-0 rounded-full border border-border/70 bg-surface-2-soft px-2 py-0.5 text-xs font-medium text-text">
              {badgeText}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className={cn("min-w-0 text-xs leading-snug whitespace-normal break-words", appTokens.metaText)}>{subtitle}</p> : null}
      </div>
      <div className="shrink-0 text-sm font-medium leading-snug text-[rgb(var(--text)/0.98)]">{rightIcon}</div>
    </>
  );

  const baseClassName = cn(
    "flex w-full items-start justify-between gap-3 text-left",
    appTokens.rowBase,
    onPress ? appTokens.rowInteractive : undefined,
    appTokens.rowDefault,
    disabled ? "cursor-not-allowed opacity-60" : undefined,
    className,
  );

  if (onPress) {
    return (
      <button
        type="button"
        className={cn(baseClassName, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25")}
        onClick={onPress}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClassName}>{content}</div>;
}
