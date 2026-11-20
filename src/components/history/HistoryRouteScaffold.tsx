import type { ReactNode } from "react";
import { AppMenu } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { FloatingHeaderSlot } from "@/components/layout/FloatingHeaderRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { HISTORY_HEADER_TRAILING_SLOT_ID, HistoryTabs } from "@/components/history/HistoryShared";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

type HistoryOverviewRouteScaffoldProps = {
  mode: "overview";
  activeTab: "sessions" | "exercises" | "progression";
  children: ReactNode;
  /** Show the app menu top right on the header line (default true). */
  showTopChrome?: boolean;
  /** Inline status on the History title line ("– Offline"), see ScreenHeader `status`. */
  headerStatus?: ReactNode;
  /** Filters that stay pinned under the segmented control (Exercises portals its search here). */
  floatingHeaderSlot?: ReactNode;
  contentRailClassName?: string;
  contentClassName?: string;
  floatingHeaderRailClassName?: string;
};

type HistoryDetailRouteScaffoldProps = {
  mode: "detail";
  floatingHeader: ReactNode;
  children: ReactNode;
  showTopChrome?: boolean;
  contentRailClassName?: string;
  contentClassName?: string;
  floatingHeaderRailClassName?: string;
};

type HistoryRouteScaffoldProps =
  | HistoryOverviewRouteScaffoldProps
  | HistoryDetailRouteScaffoldProps;

export function HistoryRouteScaffold(props: HistoryRouteScaffoldProps) {
  const showTopChrome = props.showTopChrome ?? true;
  // Overview: the standard tab header ("History", density toggle as its one trailing action), then ONE segmented
  // control for Sessions / Exercises / Progression (DESIGN-CONTRACT.md C13 and section 15).
  const floatingHeader = props.mode === "overview"
    ? (
        <div data-history-floating-header>
          <ScreenHeader
            kind="tab"
            title="History"
            status={props.headerStatus}
            trailing={props.activeTab === "progression" ? undefined : <div id={HISTORY_HEADER_TRAILING_SLOT_ID} className="contents" />}
          />
          <ContentRail className={cn(appTokens.historyOverviewHeaderStack, "pb-2", props.floatingHeaderRailClassName)}>
            <HistoryTabs
              value={props.activeTab}
              sessionsHref="/history"
              exercisesHref="/history/exercises"
              progressionHref="/history/progression"
            />
            {props.floatingHeaderSlot}
          </ContentRail>
        </div>
      )
      : (
        <FloatingHeaderSlot
          railClassName={cn(appTokens.historyDetailFloatingHeaderRail, !showTopChrome ? "pt-3" : undefined, props.floatingHeaderRailClassName)}
          data-history-floating-header
        >
          {props.floatingHeader}
        </FloatingHeaderSlot>
      );

  return (
    <MainTabScreen topNavMode="none" ambientPreset="history">
      <ScrollScreenWithBottomActions
        className={props.mode === "detail" ? "!overflow-y-hidden" : undefined}
        headerMenu={showTopChrome ? <AppMenu /> : undefined}
        floatingHeader={floatingHeader}
      >
        <ContentRail
          className={cn(
            props.mode === "detail" ? appTokens.historyDetailContentRail : appTokens.historyContentRail,
            props.contentRailClassName,
          )}
        >
          {props.mode === "detail" ? (
            <ScreenScaffold
              recipe="historyDetail"
              className={cn("flex min-h-0 flex-1 flex-col", appTokens.historyDetailScreen, props.contentClassName)}
            >
              {props.children}
            </ScreenScaffold>
          ) : (
            <div className={cn("w-full", props.contentClassName)}>{props.children}</div>
          )}
        </ContentRail>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
