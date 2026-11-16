import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

// Routine "Add exercise" screen: one ScreenHeader (kind="detail", Back on the left), the chooser below.
// The session add-exercise route still uses ExerciseChooserRouteScaffold until its own lane migrates it.
export function RoutineAddExerciseScaffold({
  title = "Add exercise",
  subtitle,
  backHref,
  backLabel = "Back to day",
  children,
}: {
  title?: string;
  subtitle?: string | null;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <AppShell topNavMode="none" className="h-[100dvh]" ambientPreset="logSet" showEdgeFrame={false}>
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ScreenHeader
            kind="detail"
            title={title}
            subtitle={subtitle}
            className="pointer-events-auto relative z-30"
            back={<ScreenHeaderBackButton href={backHref} label={backLabel} />}
          />
        )}
      >
        <ContentRail className={appTokens.currentSessionContentRail}>
          <ScreenScaffold recipe="editDay" className={cn(appTokens.routineEditorFill, "flex min-h-0 flex-1 flex-col")}>
            {children}
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
