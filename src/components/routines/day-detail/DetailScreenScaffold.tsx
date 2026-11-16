import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import type { ScreenContractName } from "@/components/ui/app/screenContract";
import { cn } from "@/lib/cn";

// `floatingHeader` is a ScreenHeader (or the slot a form portals one into). ScreenHeader owns its own width and
// gutter, so it is passed straight through with no ContentRail around it.
export function DetailScreenScaffold({
  recipe,
  floatingHeader,
  children,
  className,
  railClassName,
  expandToViewport = false,
}: {
  recipe: ScreenContractName;
  floatingHeader: ReactNode;
  children: ReactNode;
  className?: string;
  railClassName?: string;
  expandToViewport?: boolean;
}) {
  const viewportWidthClassName = expandToViewport ? "max-w-none" : undefined;

  return (
    <ScrollScreenWithBottomActions
      floatingHeader={floatingHeader}
    >
      <ContentRail className={cn("flex min-h-0 flex-1 flex-col gap-3 py-1", viewportWidthClassName, railClassName)}>
        <ScreenScaffold recipe={recipe} className={cn("w-full", className)}>
          {children}
        </ScreenScaffold>
      </ContentRail>
    </ScrollScreenWithBottomActions>
  );
}
