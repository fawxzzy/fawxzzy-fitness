import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import type { ScreenContractName } from "@/components/ui/app/screenContract";
import { cn } from "@/lib/cn";

export function DetailScreenScaffold({
  recipe,
  floatingHeader,
  children,
  className,
  railClassName,
  floatingHeaderRailClassName,
}: {
  recipe: ScreenContractName;
  floatingHeader: ReactNode;
  children: ReactNode;
  className?: string;
  railClassName?: string;
  floatingHeaderRailClassName?: string;
}) {
  return (
    <ScrollScreenWithBottomActions
      floatingHeader={(
        <ContentRail className={cn("py-1", floatingHeaderRailClassName)}>
          <ScreenScaffold recipe={recipe} className="w-full">
            {floatingHeader}
          </ScreenScaffold>
        </ContentRail>
      )}
    >
      <ContentRail className={cn("flex min-h-0 flex-1 flex-col gap-3 py-1", railClassName)}>
        <ScreenScaffold recipe={recipe} className={cn("w-full", className)}>
          {children}
        </ScreenScaffold>
      </ContentRail>
    </ScrollScreenWithBottomActions>
  );
}
