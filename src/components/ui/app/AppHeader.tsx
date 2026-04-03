import type { ReactNode } from "react";
import { EyebrowText, TitleText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";
import { headerTokens } from "@/components/ui/app/headerTokens";

export function AppHeader({
  eyebrow,
  title,
  subtitleLeft,
  subtitleRight,
  subtitle,
  meta,
  action,
  leading,
  trailing,
  className,
  actionClassName,
  titleClassName,
  titleAs = "h1",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitleLeft?: ReactNode;
  subtitleRight?: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  actionClassName?: string;
  titleClassName?: string;
  titleAs?: "h1" | "h2" | "h3";
}) {
  const secondaryItems = [subtitle, subtitleLeft, subtitleRight, meta].filter(Boolean);
  const hasSecondary = secondaryItems.length > 0;
  const actionNode = action ?? leading;

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex items-start justify-between", headerTokens.primaryRowGap)}>
        <div className="min-w-0 flex-1">
          {eyebrow ? <EyebrowText className="block text-left">{eyebrow}</EyebrowText> : null}
          <TitleText as={titleAs} className={cn("block text-left", headerTokens.titleClassName, titleClassName)}>{title}</TitleText>
          {hasSecondary ? (
            <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap)}>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {secondaryItems.map((item, index) => (
                  <div key={`secondary-${index}`} className="inline-flex items-center gap-1">
                    {index > 0 ? <span className="text-[rgb(var(--text)/0.42)]">•</span> : null}
                    <div className={cn("inline-flex text-left text-sm text-[rgb(var(--text)/0.72)]", index > 1 ? "text-[rgb(var(--text)/0.6)]" : undefined)}>{item}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {(actionNode || trailing) ? (
          <div className={cn("shrink-0 flex items-center", headerTokens.actionRailGap, actionClassName)}>
            {actionNode ? <div>{actionNode}</div> : null}
            {trailing ? <div className={headerTokens.trailingSlot}>{trailing}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
