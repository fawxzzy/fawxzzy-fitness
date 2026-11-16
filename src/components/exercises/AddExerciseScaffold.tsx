import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import type { ScreenContractName } from "@/components/ui/app/screenContract";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

// The one "Add exercise" screen frame (DESIGN-CONTRACT.md section 15), shared by the routine day editor
// (`/routines/[id]/edit/day/[dayId]/add-exercise`) and the live workout (`/session/[id]/add-exercise`):
// ScreenHeader kind="detail" with Back on the left, title "Add exercise", one `<day> · <routine>` subtitle,
// no tab bar, and the exercise chooser below. Same job, same pattern on both routes.
export function AddExerciseScaffold({
  title = "Add exercise",
  subtitle,
  backHref,
  backLabel,
  recipe = "editDay",
  children,
}: {
  title?: string;
  subtitle?: string | null;
  backHref: string;
  /** Says where Back goes, e.g. "Back to day" or "Back to workout". */
  backLabel: string;
  recipe?: Extract<ScreenContractName, "editDay" | "sessionAddExercise">;
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
            back={<ScreenHeaderBackButton href={backHref} label={backLabel} />}
          />
        )}
      >
        <ContentRail className={appTokens.currentSessionContentRail}>
          <ScreenScaffold recipe={recipe} className={cn(appTokens.routineEditorFill, "flex min-h-0 flex-1 flex-col")}>
            {children}
          </ScreenScaffold>
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
