import type { ReactNode } from "react";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { appTokens } from "@/components/ui/app/tokens";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function DetailHeader({
  eyebrow,
  title,
  titleClassName,
  subtitle,
  meta,
  action,
  children,
  className,
  actionClassName,
  align = "left",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleClassName?: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionClassName?: string;
  align?: "left" | "center";
}) {
  return (
    <SharedScreenHeader
      recipe="exerciseDetail"
      eyebrow={eyebrow}
      title={title}
      titleClassName={titleClassName}
      subtitle={subtitle}
      action={action}
      meta={meta}
      className={className}
      actionClassName={actionClassName}
      align={align}
    >
      {children}
    </SharedScreenHeader>
  );
}

export function DetailSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AppPanel className={cn(appTokens.detailSection, className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <TitleText as="h3" className={appTokens.detailSectionTitle}>{title}</TitleText>
          {description ? <SubtitleText className="text-sm">{description}</SubtitleText> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </AppPanel>
  );
}

export function DetailMetaRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(appTokens.detailMetaRow, className)}>{children}</div>;
}

export function DetailMetaChip({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div
      className={cn(
        appTokens.detailMetaChip,
        emphasized
          ? appTokens.detailMetaChipEmphasized
          : appTokens.detailMetaChipDefault,
      )}
    >
      <span className={appTokens.detailMetaChipLabel}>{label}</span>
      <span className={appTokens.detailMetaChipValue}>{value}</span>
    </div>
  );
}
