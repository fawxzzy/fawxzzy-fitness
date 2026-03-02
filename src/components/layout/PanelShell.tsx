import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

type PanelShellProps = {
  children: ReactNode;
  header?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function PanelShell({ children, header, className, bodyClassName }: PanelShellProps) {
  return (
    <section className={cn(appTokens.panelBase, "flex min-h-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]", className)}>
      {header ? <div className={cn("shrink-0", bodyClassName)}>{header}</div> : null}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}
