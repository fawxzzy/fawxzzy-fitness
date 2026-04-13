import type { ReactNode } from "react";
import { Glass } from "@/components/ui/Glass";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { textRoles } from "@/components/ui/text-roles";
import { type CardSemanticTone, cardAccentRailClassNames, cardBadgeToneClassNames, cardShellToneClassNames } from "@/components/cardSemanticTones";
import { cn } from "@/lib/cn";

const defaultChevron = <ChevronRightIcon className="h-5 w-5 text-[rgb(var(--text-muted)/0.92)]" />;

const densityStyles = {
  compact: {
    body: "min-h-[124px] px-4 py-3.5",
    title: "text-[1rem]",
    contentGap: "space-y-2.5",
    summary: "text-sm leading-snug text-[rgb(var(--text)/0.86)]",
    detail: "text-[11px] leading-[1.45] text-[rgb(var(--text-muted)/0.94)]",
    children: "pt-0.5",
  },
  detailed: {
    body: "min-h-[146px] px-4 py-4",
    title: "text-[1.04rem]",
    contentGap: "space-y-3",
    summary: "text-[0.95rem] leading-[1.45] text-[rgb(var(--text)/0.9)]",
    detail: "text-xs leading-[1.5] text-[rgb(var(--text-secondary)/0.9)]",
    children: "pt-1",
  },
} as const;

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
  density = "compact",
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
  density?: "compact" | "detailed";
}) {
  const styles = densityStyles[density];
  const body = (
    <div className={cn("relative w-full overflow-hidden", styles.body)}>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 top-0 w-[4px]",
          cardAccentRailClassNames[tone],
        )}
      />

      <div className="relative z-[1] flex min-h-full gap-3">
        <div className={cn("min-w-0 flex-1", styles.contentGap)}>
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("min-w-0 flex-1 line-clamp-2 font-semibold leading-tight [text-wrap:pretty]", styles.title, textRoles.title)}>
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

          {summary ? <p className={cn("[text-wrap:pretty]", styles.summary)}>{summary}</p> : null}
          {detail ? <p className={cn("[text-wrap:pretty]", styles.detail)}>{detail}</p> : null}
          {children ? <div className={styles.children}>{children}</div> : null}
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
