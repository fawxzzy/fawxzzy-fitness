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
  expandToViewport = false,
}: {
  recipe: ScreenContractName;
  floatingHeader: ReactNode;
  children: ReactNode;
  className?: string;
  railClassName?: string;
  floatingHeaderRailClassName?: string;
  expandToViewport?: boolean;
}) {
  const viewportWidthClassName = expandToViewport ? "max-w-none" : undefined;

  return (
    <ScrollScreenWithBottomActions
      floatingHeader={(
        <ContentRail className={cn("py-1 pt-3", viewportWidthClassName, floatingHeaderRailClassName)}>
          <ScreenScaffold recipe={recipe} className="w-full">
            {floatingHeader}
          </ScreenScaffold>
        </ContentRail>
      )}
    >
      <ContentRail className={cn("flex min-h-0 flex-1 flex-col gap-3 py-1", viewportWidthClassName, railClassName)}>
        <ScreenScaffold recipe={recipe} className={cn("w-full", className)}>
          {children}
        </ScreenScaffold>
      </ContentRail>
    </ScrollScreenWithBottomActions>
  );
}
