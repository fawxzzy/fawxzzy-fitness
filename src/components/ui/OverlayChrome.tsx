import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

export const overlayChromeClassNames = {
  scrim: "fixed inset-0 z-0 bg-[rgba(3,8,14,0.68)] backdrop-blur-[6px]",
  panelBase: cn(
    appTokens.panelBase,
    "space-y-0 p-0 border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.96)] shadow-[0_18px_48px_rgba(0,0,0,0.34)] backdrop-blur-[14px]",
  ),
  handle: "mx-auto mb-3 mt-2 h-1.5 w-14 rounded-full bg-[rgb(var(--text-muted)/0.35)]",
  header: "px-4 pb-2",
  headerStack: "space-y-1",
  eyebrow: "tracking-[0.16em]",
  title: "text-[1.3125rem] tracking-[-0.03em]",
  description: "text-sm",
  body: "min-h-0 min-w-0 overflow-x-hidden overflow-y-auto px-4 pb-[max(1rem,var(--app-safe-bottom))] pt-2",
  detailStack: "space-y-0.5",
  bulletPanel: cn(
    appTokens.panelMuted,
    "space-y-0 p-0 px-3 py-2 border-[rgb(var(--danger-rgb)/0.18)] bg-[rgb(var(--surface-2)/0.84)]",
  ),
  bulletList: "list-disc space-y-0.5 pl-4 text-xs text-[rgb(var(--text-muted)/0.95)]",
  actionGrid: "grid grid-cols-2 gap-2 pt-1",
} as const;

export function OverlayHeaderBlock({
  eyebrow,
  title,
  titleId,
  description,
  className,
  titleClassName,
  descriptionClassName,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <div className={cn(overlayChromeClassNames.header, className)}>
      <div className={overlayChromeClassNames.headerStack}>
        {eyebrow ? <EyebrowText className={overlayChromeClassNames.eyebrow}>{eyebrow}</EyebrowText> : null}
        <TitleText as="h2" id={titleId} className={cn(overlayChromeClassNames.title, titleClassName)}>
          {title}
        </TitleText>
        {description ? (
          <SubtitleText as="div" className={cn(overlayChromeClassNames.description, descriptionClassName)}>
            {description}
          </SubtitleText>
        ) : null}
      </div>
    </div>
  );
}
