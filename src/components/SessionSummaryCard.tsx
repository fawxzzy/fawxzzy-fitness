import type { ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { textRoles } from "@/components/ui/text-roles";
import { type CardSemanticTone, cardAccentRailClassNames, cardBadgeToneClassNames, cardShellToneClassNames } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

export function SessionSummaryCard({
  title,
  subtitle,
  summary,
  detail,
  children,
  badgeText,
  rightIcon = defaultChevron,
  onPress,
  className,
  tone = "neutral",
}: {
  title: string;
  subtitle?: ReactNode;
  summary?: ReactNode;
  detail?: ReactNode;
  children?: ReactNode;
  badgeText?: string;
  rightIcon?: ReactNode;
  onPress?: () => void;
  className?: string;
  tone?: CardSemanticTone;
}) {
  const body = (
    <div className="relative min-h-[104px] w-full overflow-hidden px-4 py-3">
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 top-0 w-[4px]",
          cardAccentRailClassNames[tone],
        )}
      />

      <div className="relative z-[1] flex min-h-full gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("min-w-0 flex-1 text-[1rem] font-semibold leading-tight [text-wrap:pretty]", textRoles.title)}>
                {title}
              </p>
              {badgeText ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] leading-none text-[rgb(var(--text-primary)/0.9)]",
                    "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.92)]",
                    cardBadgeToneClassNames[tone],
                  )}
                >
                  {badgeText}
                </span>
              ) : null}
            </div>
            {subtitle ? <div className={cn("text-xs leading-[1.35] text-[rgb(var(--text-secondary)/0.98)] [text-wrap:pretty]", textRoles.subtitle)}>{subtitle}</div> : null}
          </div>

          {summary ? <p className="text-sm leading-snug text-[rgb(var(--text)/0.84)] [text-wrap:pretty]">{summary}</p> : null}
          {detail ? <p className="text-xs leading-[1.45] text-[rgb(var(--text-muted)/0.94)] [text-wrap:pretty]">{detail}</p> : null}
          {children ? <div className="pt-0.5">{children}</div> : null}
        </div>

        {rightIcon ? <div className="flex shrink-0 items-start justify-end pt-0.5">{rightIcon}</div> : null}
      </div>
    </div>
  );

  return (
    <Glass variant="base" interactive={Boolean(onPress)} className={cn("w-full rounded-[var(--card-radius)] text-left", cardShellToneClassNames[tone], className)}>
      {onPress ? (
        <button
          type="button"
          className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-blue)/0.22)]"
          onClick={onPress}
        >
          {body}
        </button>
      ) : body}
    </Glass>
  );
}
