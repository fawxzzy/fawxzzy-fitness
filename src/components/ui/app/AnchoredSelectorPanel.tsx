import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { cn } from "@/lib/cn";

type AnchoredSelectorPanelProps = {
  title: ReactNode;
  subtitleRight?: ReactNode;
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
};

export function AnchoredSelectorPanel({
  title,
  subtitleRight,
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
}: AnchoredSelectorPanelProps) {
  const hasSummary = Boolean(summaryLabel || summaryHint);

  return (
    <AppPanel className={cn("space-y-4 p-4 pt-[1.2rem]", className)}>
      <div className="space-y-2 rounded-[1.25rem] border border-white/10 bg-[rgb(var(--bg)/0.18)] p-3.5">
        <AppHeader title={title} subtitleRight={subtitleRight} action={action} />

        {hasSummary ? (
          <div className="min-w-0 space-y-1 border-t border-white/8 pt-3">
            {summaryLabel ? (
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text)/0.52)]">
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
            className="space-y-2 border-t border-white/10 pt-3"
          >
            {revealContent}
          </div>
        ) : null}
      </div>

      {children ? <div className={cn("space-y-3", bodyClassName)}>{children}</div> : null}
    </AppPanel>
  );
}
