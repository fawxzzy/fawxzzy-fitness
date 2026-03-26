import type { ReactNode } from "react";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";
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
  const hasSecondary = Boolean(subtitle || subtitleLeft || subtitleRight || meta);
  const actionNode = action ?? leading;

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex items-start justify-between", headerTokens.primaryRowGap)}>
        <div className="min-w-0 flex-1">
          {eyebrow ? <EyebrowText className="block text-left">{eyebrow}</EyebrowText> : null}
          <TitleText as={titleAs} className={cn("block text-left", headerTokens.titleClassName, titleClassName)}>{title}</TitleText>
          {hasSecondary ? (
            <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap)}>
              {subtitle ? <SubtitleText className="block text-left">{subtitle}</SubtitleText> : null}
              {(subtitleLeft || subtitleRight) ? (
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {subtitleLeft ? <SubtitleText className="inline-flex text-left">{subtitleLeft}</SubtitleText> : null}
                  {subtitleRight ? <SubtitleText className="inline-flex text-left text-[rgb(var(--text)/0.54)]">{subtitleRight}</SubtitleText> : null}
                </div>
              ) : null}
              {meta ? <div>{meta}</div> : null}
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
