import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";

// The Create day / Copy a day screen frame (DESIGN-CONTRACT.md section 15): a detail screen with Back on the
// left and no tab bar. Shared by the route and its `/dev/detail-screens` fixture so the fixture shows what users see.
export function CreateDayScreen({
  targetDayLabel,
  routineName,
  backHref,
  children,
}: {
  /** Set in copy mode (`?targetDayId=`): the day the copy lands in. */
  targetDayLabel?: string | null;
  routineName: string;
  backHref: string;
  children: ReactNode;
}) {
  const isTargetMode = Boolean(targetDayLabel);
  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ScreenHeader
            kind="detail"
            title={isTargetMode ? "Copy a day" : "Create day"}
            subtitle={isTargetMode ? `Into ${targetDayLabel} · ${routineName}` : routineName}
            back={<ScreenHeaderBackButton href={backHref} />}
          />
        )}
      >
        <ContentRail className="space-y-3">{children}</ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
