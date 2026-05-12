import type { ReactNode } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TitleText, SubtitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <SurfaceCard className={cn("items-start text-left", className)}>
      <div className="space-y-2">
        <div className="h-10 w-10 rounded-[var(--radius-md)] border border-[rgb(var(--border)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.9)]" />
        <TitleText as="h3" className="text-[1.3125rem]">
          {title}
        </TitleText>
        <SubtitleText className="block max-w-[32ch]">{body}</SubtitleText>
      </div>
      {action ? <div>{action}</div> : null}
    </SurfaceCard>
  );
}
