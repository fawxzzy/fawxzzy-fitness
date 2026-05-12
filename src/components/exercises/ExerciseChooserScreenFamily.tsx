import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import type { ScreenContractName } from "@/components/ui/app/screenContract";
import { cn } from "@/lib/cn";

export function ExerciseChooserRouteScaffold({
  recipe,
  title,
  backHref,
  backAriaLabel,
  children,
  headerAlign = "left",
  floatingHeaderRailClassName,
  contentRailClassName,
  backButtonClassName,
}: {
  recipe: Extract<ScreenContractName, "sessionAddExercise" | "editDay">;
  title: ReactNode;
  backHref: string;
  backAriaLabel: string;
  children: ReactNode;
  headerAlign?: "left" | "center";
  floatingHeaderRailClassName?: string;
  contentRailClassName?: string;
  backButtonClassName?: string;
}) {
  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="logSet" showEdgeFrame={false}>
      <ScrollScreenWithBottomActions
      floatingHeader={(
          <ContentRail className={cn("py-1 pt-3", floatingHeaderRailClassName)}>
            <ScreenScaffold recipe={recipe} className={appTokens.routineEditorFill}>
              <RoutineEditorPageHeader
                recipe={recipe}
                title={title}
                align={headerAlign}
                withPanel={false}
                action={(
                  <TopRightBackButton
                    href={backHref}
                    ariaLabel={backAriaLabel}
                    historyBehavior="fallback-only"
                    className={backButtonClassName}
                  />
                )}
              />
            </ScreenScaffold>
          </ContentRail>
        )}
      >
        <ContentRail className={cn(appTokens.currentSessionContentRail, contentRailClassName)}>
          <ScreenScaffold recipe={recipe} className={cn(appTokens.routineEditorFill, "flex min-h-0 flex-1 flex-col")}>
            {children}
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
