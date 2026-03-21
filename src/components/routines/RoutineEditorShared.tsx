import type { ReactNode } from "react";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
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
