import type { ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { resolveScreenRecipe, type ScreenContractName } from "@/components/ui/app/screenContract";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function SharedSectionShell({
  recipe,
  label,
  context,
  meta,
  action,
  children,
  summary,
  footer,
  listState,
  className,
  bodyClassName,
}: {
  recipe: ScreenContractName;
  label?: ReactNode;
  context?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  summary?: ReactNode;
  footer?: ReactNode;
  listState?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const screenRecipe = resolveScreenRecipe(recipe);
  const hasSectionHeader = Boolean(label || context || meta || action);

  return (
    <AppPanel
      data-section-shell-recipe={screenRecipe.sectionShellRecipe}
      data-metadata-grammar={screenRecipe.metadataSubtitleGrammar}
      className={cn(screenRecipe.sectionShellClassName, className)}
    >
      {hasSectionHeader ? (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {label ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.58)]">{label}</p>
            ) : null}
            {context ? <SubtitleText>{context}</SubtitleText> : null}
            {meta ? <div>{meta}</div> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}

      {children ? <div className={cn(screenRecipe.sectionBodyClassName, bodyClassName)}>{children}</div> : null}
      {summary ? <div>{summary}</div> : null}
      {footer ? <div>{footer}</div> : null}
      {listState ? <div>{listState}</div> : null}
    </AppPanel>
  );
}
