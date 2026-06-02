import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

type RoutinesPageScaffoldProps = {
  children: ReactNode;
};

export function RoutinesPageScaffold({ children }: RoutinesPageScaffoldProps) {
  return <div className={appTokens.routinesOverviewPageStack}>{children}</div>;
}

export function ActiveRoutineSummaryCard({
  title,
  metadata,
  status,
}: {
  title: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
}) {
  return <SharedScreenHeader recipe="routinesOverview" title={title} meta={metadata} action={status} align="center" />;
}

export function RoutinesRouteHeaderCard({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return <SharedScreenHeader recipe="routinesOverview" withPanel={false} title={title} subtitle={subtitle} action={action} align="center" />;
}

export function ActiveRoutineStatusBadge({ active }: { active: boolean }) {
  return active ? <AppBadge tone="success">ACTIVE</AppBadge> : null;
}

export function RoutinesSectionCard({
  title,
  meta,
  action,
  children,
}: {
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SharedSectionShell
      recipe="routinesOverview"
      label={title}
      context={meta}
      action={action}
      className={appTokens.routinesOverviewSectionStack}
      bodyClassName={appTokens.routinesOverviewSectionStack}
    >
      {children}
    </SharedSectionShell>
  );
}

export function RoutinesCardList({ children }: { children: ReactNode }) {
  return <ul className={cn(appTokens.dayListStack, "space-y-[0.375rem] sm:space-y-[0.375rem]")}>{children}</ul>;
}

export function RoutinesListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function RoutinesListEmpty({ children }: { children: ReactNode }) {
  return <SubtitleText className={appTokens.routinesOverviewListEmpty}>{children}</SubtitleText>;
}

export function SharedDayListSection({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={appTokens.dayListStack}>{children}</div>;
}


export function RoutinesListItemCard(props: ComponentProps<typeof ExerciseCard>) {
  return <ExerciseCard {...props} className={cn(appTokens.routinesOverviewCardFlat, props.className)} variant="compact" />;
}
