import type { ReactNode } from "react";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { type ScreenContractName } from "@/components/ui/app/screenContract";
import { cn } from "@/lib/cn";

type AnchoredSelectorPanelProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleRight?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  summaryLabel?: ReactNode;
  summaryHint?: ReactNode;
  revealOpen: boolean;
  revealId: string;
  revealLabel: string;
  revealContent?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  recipe?: ScreenContractName;
};

export function AnchoredSelectorPanel({
  eyebrow,
  title,
  subtitle,
  subtitleRight,
  meta,
  action,
  summaryLabel,
  summaryHint,
  revealOpen,
  revealId,
  revealLabel,
  revealContent,
  children,
  className,
  bodyClassName,
  recipe = "todayOverview",
}: AnchoredSelectorPanelProps) {
  const hasSummary = Boolean(summaryLabel || summaryHint);

  return (
    <section className={cn("space-y-2.5", className)}>
      <SharedScreenHeader
        recipe={recipe}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        subtitleRight={subtitleRight}
        meta={meta}
        action={action}
        withPanel={false}
      >
        <div className="space-y-1.5">
          {hasSummary ? (
            <div className="min-w-0 space-y-1 border-t border-white/8 pt-2">
              {summaryLabel ? (
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.5)]">
                  {summaryLabel}
                </p>
              ) : null}
              {summaryHint ? <p className="text-sm leading-snug text-[rgb(var(--text)/0.72)]">{summaryHint}</p> : null}
            </div>
          ) : null}

          {revealOpen && revealContent ? (
            <div
              id={revealId}
              aria-label={revealLabel}
              className="space-y-1.5 border-t border-white/10 pt-2"
            >
              {revealContent}
            </div>
          ) : null}
        </div>
      </SharedScreenHeader>

      {children ? <div className={cn("space-y-2.5", bodyClassName)}>{children}</div> : null}
    </section>
  );
}
