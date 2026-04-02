import type { ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { resolveScreenRecipe, type ScreenContractName } from "@/components/ui/app/screenContract";
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
  const screenRecipe = resolveScreenRecipe(recipe);

  return (
    <AppPanel
      data-screen-scaffold={screenRecipe.scaffold}
      data-section-chrome={screenRecipe.sectionChrome}
      data-footer-dock={screenRecipe.footerDock}
      className={cn(screenRecipe.headerPanelClassName, className)}
    >
      <div className="space-y-2 rounded-[1.25rem] border border-white/10 bg-[rgb(var(--bg)/0.18)] p-3.5">
        <SharedScreenHeader
          recipe={recipe}
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          subtitleRight={subtitleRight}
          meta={meta}
          action={action}
          className="rounded-none border-0 bg-transparent p-0 shadow-none"
        />

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
