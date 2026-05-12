import type { ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { appTokens } from "@/components/ui/app/tokens";
import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function WorkoutEntrySection({
  eyebrow,
  title,
  description,
  aside,
  children,
  className,
  contentClassName,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <AppPanel className={cn(appTokens.exerciseLogSectionPanel, className)}>
      <div className={fitnessDesignPrimitiveClassNames.sectionLayout.sectionHeaderClassName}>
        <div className={appTokens.exerciseLogSectionHeaderCopy}>
          {eyebrow ? <p className={appTokens.measurementLabel}>{eyebrow}</p> : null}
          {title ? <TitleText as="h3" className={appTokens.exerciseLogSectionTitle}>{title}</TitleText> : null}
          {description ? <SubtitleText>{description}</SubtitleText> : null}
        </div>
        {aside ? <div className={appTokens.exerciseLogSectionAside}>{aside}</div> : null}
      </div>

      <div className={cn(fitnessDesignPrimitiveClassNames.sectionLayout.sectionBodyDenseClassName, contentClassName)}>
        {children}
      </div>
    </AppPanel>
  );
}

export function WorkoutEntryIdentity({
  eyebrow,
  title,
  description,
  descriptionClassName,
  meta,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  descriptionClassName?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="exerciseLog"
      eyebrow={eyebrow}
      title={title}
      subtitle={description}
      subtitleClassName={descriptionClassName}
      meta={meta}
      action={actions}
      className={className}
    />
  );
}

export function WorkoutEntryMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className={cn(appTokens.exerciseLogMetric, tone === "warning" ? appTokens.exerciseLogMetricWarning : undefined)}>
      <p className={appTokens.exerciseLogMetricLabel}>{label}</p>
      <p className={cn(appTokens.exerciseLogMetricValue, tone === "warning" ? appTokens.exerciseLogMetricValueWarning : undefined)}>{value}</p>
    </div>
  );
}
