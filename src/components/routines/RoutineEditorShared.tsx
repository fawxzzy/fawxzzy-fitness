import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { BottomActionStackedPrimary } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ExerciseCard } from "@/components/ExerciseCard";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function RoutineEditorPageHeader({
  eyebrow,
  title,
  subtitle,
  subtitleRight,
  action,
  actionClassName,
  children,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
  actionClassName?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cn("space-y-4 p-4", className)}>
      <AppHeader
        eyebrow={eyebrow}
        title={title}
        subtitleLeft={subtitle}
        subtitleRight={subtitleRight}
        action={action}
        actionClassName={actionClassName}
      />
      {children ? <div className="space-y-3 border-t border-white/8 pt-3">{children}</div> : null}
    </AppPanel>
  );
}

export function RoutineEditorSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cn("space-y-4 p-4", className)}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.58)]">{title}</p>
        {description ? <SubtitleText>{description}</SubtitleText> : null}
      </div>
      {children}
    </AppPanel>
  );
}

export function RoutineEditorDayRow({
  title,
  subtitle,
  badgeText,
  state = "default",
  href,
  rightLabel,
  className,
}: {
  title: string;
  subtitle?: string;
  badgeText?: string;
  state?: ComponentProps<typeof ExerciseCard>["state"];
  href?: string;
  rightLabel?: ReactNode;
  className?: string;
}) {
  const card = (
    <ExerciseCard
      title={title}
      subtitle={subtitle}
      badgeText={badgeText}
      state={state}
      variant="interactive"
      rightIcon={rightLabel ?? <span aria-hidden="true" className="text-muted">›</span>}
      className={cn("items-center", className)}
    />
  );

  if (!href) return card;
  return <Link href={href} className="block">{card}</Link>;
}

export function RoutineEditorStickyActions({
  primary,
  cancelHref,
  secondary,
}: {
  primary: ReactNode;
  cancelHref: string;
  secondary?: ReactNode;
}) {
  return (
    <PublishBottomActions>
      <BottomActionStackedPrimary
        utility={(
          <>
            <Link href={cancelHref} className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}>
              Cancel
            </Link>
            {secondary ?? <div aria-hidden="true" />}
          </>
        )}
        primary={<div className="space-y-2">{primary}</div>}
      />
    </PublishBottomActions>
  );
}
