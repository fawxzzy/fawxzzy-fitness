import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { resolveScreenRecipe, type ScreenContractName } from "@/components/ui/app/screenContract";
import { standaloneHeaderFamily } from "@/components/ui/app/standaloneHeaderFamily";
import { cn } from "@/lib/cn";

export function SharedScreenHeader({
  recipe,
  eyebrow,
  title,
  titleClassName,
  subtitle,
  subtitleRight,
  meta,
  action,
  children,
  className,
  actionClassName,
  subtitleClassName,
  separatorClassName,
  align = "left",
  withPanel = true,
  showSeparator = true,
}: {
  recipe: ScreenContractName;
  eyebrow?: ReactNode;
  title: ReactNode;
  titleClassName?: string;
  subtitle?: ReactNode;
  subtitleRight?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionClassName?: string;
  subtitleClassName?: string;
  separatorClassName?: string;
  align?: "left" | "center";
  withPanel?: boolean;
  showSeparator?: boolean;
}) {
  const screenRecipe = resolveScreenRecipe(recipe);
  const headerNode = (
    <>
      <AppHeader
        eyebrow={eyebrow}
        title={title}
        subtitleLeft={subtitle}
        subtitleRight={subtitleRight}
        meta={meta}
        action={action}
        align={align}
        showSeparator={showSeparator}
        separatorClassName={separatorClassName}
        className={standaloneHeaderFamily.headerClassName}
        actionClassName={cn(standaloneHeaderFamily.actionClassName, actionClassName)}
        titleClassName={cn(standaloneHeaderFamily.titleClassName, titleClassName)}
        subtitleClassName={subtitleClassName}
      />
      {children ? <div className={standaloneHeaderFamily.dividerClassName}>{children}</div> : null}
    </>
  );

  if (!withPanel) {
    return (
      <div
        data-shared-screen-header="true"
        className={cn(screenRecipe.headerPanelClassName, className)}
      >
        {headerNode}
      </div>
    );
  }

  return (
    <AppPanel
      data-shared-screen-header="true"
      data-screen-scaffold={screenRecipe.scaffold}
      data-section-chrome={screenRecipe.sectionChrome}
      data-footer-dock={screenRecipe.footerDock}
      data-header-inset-mode={screenRecipe.headerInsetMode}
      className={cn(standaloneHeaderFamily.panelClassName, screenRecipe.headerPanelClassName, className)}
    >
      {headerNode}
    </AppPanel>
  );
}
