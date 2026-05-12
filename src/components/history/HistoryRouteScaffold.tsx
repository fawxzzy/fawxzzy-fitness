import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { FloatingHeaderSlot } from "@/components/layout/FloatingHeaderRail";
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
  activeTab: "sessions" | "exercises" | "progression";
  children: ReactNode;
  showTopChrome?: boolean;
  floatingHeaderSlot?: ReactNode;
  headerChrome?: "titleOnly" | "tabsWithControls" | "controlsOnly";
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
  const floatingHeader = props.mode === "overview"
    ? (() => {
        const headerChrome = props.headerChrome ?? "tabsWithControls";
        const showTabs = headerChrome === "tabsWithControls";
        const showTitleHeader = headerChrome !== "controlsOnly";
        const headerChildren = showTabs || props.floatingHeaderSlot
          ? (
              <div className={showTabs ? appTokens.historyOverviewHeaderStack : appTokens.historyExerciseHeaderStack}>
                {showTabs ? (
                  <HistoryTabs
                    value={props.activeTab}
                    sessionsHref="/history"
                    exercisesHref="/history/exercises"
                    progressionHref="/history/progression"
                  />
                ) : null}
                {props.floatingHeaderSlot}
              </div>
            )
          : null;

        return (
          <FloatingHeaderSlot
            railClassName={cn(appTokens.historyFloatingHeaderRail, props.floatingHeaderRailClassName)}
            data-history-floating-header
          >
            {showTitleHeader ? (
              <HistoryPageHeader title={props.title} subtitle={props.subtitle} withPanel={headerChrome !== "titleOnly"}>
                {headerChildren}
              </HistoryPageHeader>
            ) : (
              props.floatingHeaderSlot
            )}
          </FloatingHeaderSlot>
        );
      })()
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
        topChrome={showTopChrome ? <AppNav mode="topChrome" /> : undefined}
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
