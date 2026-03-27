import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { resolveScreenContract, type ScreenContractName } from "@/components/ui/app/screenContract";
import { standaloneHeaderFamily } from "@/components/ui/app/standaloneHeaderFamily";
import { cn } from "@/lib/cn";

export function SharedScreenHeader({
  recipe,
  eyebrow,
  title,
  subtitle,
  subtitleRight,
  meta,
  action,
  children,
  className,
  actionClassName,
}: {
  recipe: ScreenContractName;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleRight?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionClassName?: string;
}) {
  const contract = resolveScreenContract(recipe);

  return (
    <AppPanel
      data-screen-scaffold={contract.scaffold}
      data-section-chrome={contract.sectionChrome}
      data-footer-dock={contract.footerDock}
      className={cn(standaloneHeaderFamily.panelClassName, className)}
    >
      <AppHeader
        eyebrow={eyebrow}
        title={title}
        subtitleLeft={subtitle}
        subtitleRight={subtitleRight}
        meta={meta}
        action={action}
        className={standaloneHeaderFamily.headerClassName}
        actionClassName={cn(standaloneHeaderFamily.actionClassName, actionClassName)}
        titleClassName={standaloneHeaderFamily.titleClassName}
      />
      {children ? <div className={standaloneHeaderFamily.dividerClassName}>{children}</div> : null}
    </AppPanel>
  );
}
