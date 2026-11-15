import type { ComponentProps, ReactNode } from "react";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { cn } from "@/lib/cn";

export function TodayRouteScaffold({
  children,
  floatingHeader,
}: {
  children: ReactNode;
  floatingHeader?: ReactNode;
}) {
  return (
    <MainTabScreen topNavMode="none" ambientPreset="today">
      <ScrollScreenWithBottomActions
        topChrome={<AppNav mode="topChrome" />}
        floatingHeader={floatingHeader}
      >
        {children}
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}

/** Legacy centred header; only the session screen still uses it until H1 moves it to ScreenHeader kind="detail". */
export function TodayOverviewHeader(props: Omit<ComponentProps<typeof SharedScreenHeader>, "recipe">) {
  return <SharedScreenHeader recipe="todayOverview" withPanel={false} {...props} />;
}

export function TodayOverviewContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ContentRail className={cn("flex flex-col gap-[0.75rem]", className)}>{children}</ContentRail>;
}

export function TodayOverviewScaffold({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <ScreenScaffold recipe="todayOverview" className={cn("w-full", className)}>
      {children}
    </ScreenScaffold>
  );
}

export function TodayOverviewSection({
  scaffoldClassName,
  ...props
}: Omit<ComponentProps<typeof SharedSectionShell>, "recipe"> & {
  scaffoldClassName?: string;
}) {
  return (
    <TodayOverviewScaffold className={scaffoldClassName}>
      <SharedSectionShell recipe="todayOverview" {...props} />
    </TodayOverviewScaffold>
  );
}
