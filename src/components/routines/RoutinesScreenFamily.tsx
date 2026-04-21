import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

type RoutinesPageScaffoldProps = {
  children: ReactNode;
};

export function RoutinesPageScaffold({ children }: RoutinesPageScaffoldProps) {
  return <div className="space-y-4">{children}</div>;
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
  return <SharedScreenHeader recipe="routinesOverview" title={title} meta={metadata} action={status} />;
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
  return <SharedScreenHeader recipe="routinesOverview" title={title} subtitle={subtitle} action={action} />;
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
      className="space-y-4"
      bodyClassName="space-y-4"
    >
      {children}
    </SharedSectionShell>
  );
}

export function RoutinesCardList({ children }: { children: ReactNode }) {
  return <ul className={fitnessDesignPrimitiveClassNames.sectionLayout.sectionBodyDenseClassName}>{children}</ul>;
}

export function RoutinesListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function RoutinesListEmpty({ children }: { children: ReactNode }) {
  return <SubtitleText className="px-1">{children}</SubtitleText>;
}

export function SharedDayListSection({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SharedSectionShell
      recipe="routinesOverview"
      bodyClassName={fitnessDesignPrimitiveClassNames.sectionLayout.sectionBodyDenseClassName}
    >
      {children}
    </SharedSectionShell>
  );
}


export function RoutinesListItemCard(props: ComponentProps<typeof ExerciseCard>) {
  return <ExerciseCard {...props} className={cn("shadow-none", props.className)} variant="compact" />;
}
