import type { ReactNode } from "react";
import { SharedScreenHeader } from "@/components/ui/app/SharedScreenHeader";
import { appTokens } from "@/components/ui/app/tokens";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function DetailHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  action,
  children,
  className,
  actionClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  actionClassName?: string;
}) {
  return (
    <SharedScreenHeader
      recipe="exerciseDetail"
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      action={action}
      meta={meta}
      className={className}
      actionClassName={actionClassName}
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
      <div className={appTokens.detailSectionHeader}>
        <div className={appTokens.detailSectionHeaderContent}>
          <TitleText as="h3" className={appTokens.detailSectionTitle}>{title}</TitleText>
          {description ? <SubtitleText className={appTokens.detailSectionDescription}>{description}</SubtitleText> : null}
        </div>
        {action ? <div className={appTokens.detailSectionAction}>{action}</div> : null}
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
