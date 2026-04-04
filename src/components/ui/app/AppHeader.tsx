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
  const shouldMergeSubtitleAndMeta = !subtitleRight && Boolean(resolvedSubtitle) && hasMeta;

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex items-start justify-between", headerTokens.primaryRowGap)}>
        <div className="min-w-0 flex-1">
          {eyebrow ? <EyebrowText className="block text-left">{eyebrow}</EyebrowText> : null}
          <TitleText as={titleAs} className={cn("block text-left [text-wrap:balance]", headerTokens.titleClassName, titleClassName)}>{title}</TitleText>
          {hasSubtitleRow || hasMeta ? (
            <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap)}>
              {hasSubtitleRow ? (
                <div className={cn("flex min-w-0 gap-2", subtitleRight ? "items-start justify-between" : "items-center")}>
                  {shouldMergeSubtitleAndMeta ? (
                    <div className="min-w-0 text-left text-sm text-[rgb(var(--text)/0.72)] [text-wrap:pretty]">
                      <span className="align-middle">{resolvedSubtitle}</span>
                      <span className="inline align-middle whitespace-nowrap text-[rgb(var(--text)/0.6)] before:px-1 before:text-[rgb(var(--text)/0.5)] before:content-['•']">
                        {meta}
                      </span>
                    </div>
                  ) : resolvedSubtitle ? (
                    <div className="min-w-0 text-left text-sm text-[rgb(var(--text)/0.72)] [text-wrap:pretty]">{resolvedSubtitle}</div>
                  ) : <span />}
                  {subtitleRight ? (
                    <div className="shrink-0 text-right text-sm text-[rgb(var(--text)/0.6)]">{subtitleRight}</div>
                  ) : null}
                </div>
              ) : null}
              {hasMeta && !shouldMergeSubtitleAndMeta ? (
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
