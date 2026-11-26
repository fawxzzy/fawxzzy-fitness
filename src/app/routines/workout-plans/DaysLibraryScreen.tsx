import type { ReactNode } from "react";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";

// The Days library screen frame. Pushed from Routines, so a detail screen (DESIGN-CONTRACT 15.1): Back to
// /routines; a read-only child, so the bottom tab bar stays (src/lib/app-tabs.ts). Shared by the route and its `/dev/detail-screens` fixture.
export function DaysLibraryScreen({ children }: { children: ReactNode }) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="viewDay">
      <ScrollScreenWithBottomActions
        floatingHeader={(
          <ScreenHeader
            kind="detail"
            title="Days"
            back={<ScreenHeaderBackButton href="/routines" label="Back to routines" />}
          />
        )}
      >
        <ContentRail className="space-y-3">{children}</ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
