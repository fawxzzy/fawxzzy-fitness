import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { Chip } from "@/components/ui/Chip";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

const CARD_HEADER_CLASS_NAME = "-mx-4 -mt-1 pb-1 sm:-mx-5";
const SECTION_TITLE_CLASS_NAME = "text-[1.3125rem] font-semibold leading-[1.04] tracking-[-0.03em]";

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
  return (
    <SurfaceCard dense>
      <AppHeader
        title={title}
        meta={metadata}
        action={status}
        className={CARD_HEADER_CLASS_NAME}
      />
    </SurfaceCard>
  );
}

export function ActiveRoutineStatusBadge({ active }: { active: boolean }) {
  return active ? <Chip tone="success">ACTIVE</Chip> : null;
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
    <SurfaceCard dense>
      <AppHeader
        title={title}
        meta={meta}
        action={action}
        titleAs="h2"
        className={CARD_HEADER_CLASS_NAME}
        titleClassName={SECTION_TITLE_CLASS_NAME}
      />
      {children}
    </SurfaceCard>
  );
}

export function RoutinesCardList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

export function RoutinesListItem({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function RoutinesListEmpty({ children }: { children: ReactNode }) {
  return <SubtitleText className="px-1">{children}</SubtitleText>;
}

export function SharedDayListSection({
  title = "Days",
  meta,
  children,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return <RoutinesSectionCard title={title} meta={meta}>{children}</RoutinesSectionCard>;
}


export function RoutinesListItemCard(props: ComponentProps<typeof ExerciseCard>) {
  return <ExerciseCard {...props} className={cn("shadow-none", props.className)} variant="compact" />;
}
