import type { ReactNode } from "react";
import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";
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
  headerClassName,
  headerContentClassName,
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
  headerClassName?: string;
  headerContentClassName?: string;
  bodyClassName?: string;
}) {
  const screenRecipe = resolveScreenRecipe(recipe);
  const sectionTokens = fitnessDesignPrimitiveClassNames.sectionLayout;
  const hasSectionHeader = Boolean(label || context || meta || action);

  return (
    <AppPanel
      data-section-shell-recipe={screenRecipe.sectionShellRecipe}
      data-metadata-grammar={screenRecipe.metadataSubtitleGrammar}
      className={cn(screenRecipe.sectionShellClassName, className)}
    >
      {hasSectionHeader ? (
        <div className={cn(sectionTokens.sectionHeaderClassName, headerClassName)}>
          <div className={cn("min-w-0 space-y-1", headerContentClassName)}>
            {label ? (
              <p className={sectionTokens.sectionLabelClassName}>{label}</p>
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
