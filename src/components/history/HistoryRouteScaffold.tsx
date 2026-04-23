import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { HistoryPageHeader, HistoryTabs } from "@/components/history/HistoryShared";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

type HistoryOverviewRouteScaffoldProps = {
  mode: "overview";
  title: string;
  subtitle?: string;
  activeTab: "sessions" | "exercises";
  children: ReactNode;
  floatingHeaderSlot?: ReactNode;
  contentRailClassName?: string;
  contentClassName?: string;
  floatingHeaderRailClassName?: string;
};

type HistoryDetailRouteScaffoldProps = {
  mode: "detail";
  floatingHeader: ReactNode;
  children: ReactNode;
  contentRailClassName?: string;
  contentClassName?: string;
  floatingHeaderRailClassName?: string;
};

type HistoryRouteScaffoldProps =
  | HistoryOverviewRouteScaffoldProps
  | HistoryDetailRouteScaffoldProps;

export function HistoryRouteScaffold(props: HistoryRouteScaffoldProps) {
  const floatingHeader = props.mode === "overview"
    ? (
        <ContentRail className={cn(appTokens.historyFloatingHeaderRail, props.floatingHeaderRailClassName)}>
          <HistoryPageHeader title={props.title} subtitle={props.subtitle}>
            <div className={appTokens.historyOverviewHeaderStack}>
              <HistoryTabs
                value={props.activeTab}
                sessionsHref="/history"
                exercisesHref="/history/exercises"
              />
              {props.floatingHeaderSlot}
            </div>
          </HistoryPageHeader>
        </ContentRail>
      )
      : (
        <ContentRail className={cn(appTokens.historyDetailFloatingHeaderRail, props.floatingHeaderRailClassName)}>
          <div data-history-floating-header className="w-full">
            {props.floatingHeader}
          </div>
        </ContentRail>
      );

  return (
    <MainTabScreen topNavMode="none" ambientPreset="history">
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
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
              className={cn(appTokens.historyDetailScreen, props.contentClassName)}
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
