import type { ComponentProps, ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { resolveScreenRecipe } from "@/components/ui/app/screenContract";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

type RoutinesPageScaffoldProps = {
  summary: ReactNode;
  children: ReactNode;
};

export function RoutinesPageScaffold({ summary, children }: RoutinesPageScaffoldProps) {
  return <div className="space-y-4">{summary}<div className="space-y-4">{children}</div></div>;
}

export function ActiveRoutineSummaryCard({
  sectionLabel,
  title,
  metadata,
  status,
}: {
  sectionLabel: ReactNode;
  title: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
}) {
  const recipe = resolveScreenRecipe("routinesOverview");
  return (
    <div className="space-y-0">
      <SharedScreenHeader
        recipe="routinesOverview"
        eyebrow={sectionLabel}
        title={title}
        subtitle={metadata}
        action={status}
        className={cn(
          recipe.headerPanelClassName,
          "rounded-[1.25rem] bg-[rgb(var(--bg)/0.18)] p-0 shadow-none",
        )}
      />
    </div>
  );
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
  const recipe = resolveScreenRecipe("routinesOverview");
  return (
    <AppPanel
      data-screen-scaffold={recipe.scaffold}
      data-section-chrome={recipe.sectionChrome}
      data-footer-dock={recipe.footerDock}
      className={recipe.sectionClassName}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <TitleText as="h2" className="text-base">
            {title}
          </TitleText>
          {meta ? <SubtitleText>{meta}</SubtitleText> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </AppPanel>
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
  return <ExerciseCard {...props} className={cn("items-center", props.className)} variant="interactive" />;
}
