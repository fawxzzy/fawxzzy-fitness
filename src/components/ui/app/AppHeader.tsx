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
  const resolvedSubtitle = subtitle ?? subtitleLeft;
  const hasSubtitleRow = Boolean(resolvedSubtitle || subtitleRight);
  const hasMeta = Boolean(meta);
  const actionNode = action ?? leading;

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex items-start justify-between", headerTokens.primaryRowGap)}>
        <div className="min-w-0 flex-1">
          {eyebrow ? <EyebrowText className="block text-left">{eyebrow}</EyebrowText> : null}
          <TitleText as={titleAs} className={cn("block text-left", headerTokens.titleClassName, titleClassName)}>{title}</TitleText>
          {hasSubtitleRow || hasMeta ? (
            <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap)}>
              {hasSubtitleRow ? (
                <div className="flex items-start justify-between gap-2">
                  {resolvedSubtitle ? (
                    <div className="min-w-0 text-left text-sm text-[rgb(var(--text)/0.72)]">{resolvedSubtitle}</div>
                  ) : <span />}
                  {subtitleRight ? (
                    <div className="shrink-0 text-right text-sm text-[rgb(var(--text)/0.6)]">{subtitleRight}</div>
                  ) : null}
                </div>
              ) : null}
              {hasMeta ? (
                <div className="text-left text-sm text-[rgb(var(--text)/0.6)]">{meta}</div>
              ) : null}
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
