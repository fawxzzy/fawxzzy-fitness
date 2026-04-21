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
  subtitleClassName,
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
  subtitleClassName?: string;
  titleAs?: "h1" | "h2" | "h3";
}) {
  const resolvedSubtitle = subtitle ?? subtitleLeft;
  const hasSubtitleRow = Boolean(resolvedSubtitle || subtitleRight);
  const hasMeta = Boolean(meta);
  const isTitleOnlyHeader = !eyebrow && !hasSubtitleRow && !hasMeta;
  const actionNode = action ?? leading;
  const shouldMergeSubtitleAndMeta = !subtitleRight && Boolean(resolvedSubtitle) && hasMeta;

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex justify-between", isTitleOnlyHeader ? "items-center" : "items-start", headerTokens.primaryRowGap)}>
        <div className="min-w-0 flex-1">
          {eyebrow ? <EyebrowText className={cn("block text-left", headerTokens.eyebrowClassName)}>{eyebrow}</EyebrowText> : null}
          <TitleText as={titleAs} className={cn("block text-left [text-wrap:balance]", headerTokens.titleClassName, headerTokens.titleTextClassName, titleClassName)}>{title}</TitleText>
          {hasSubtitleRow || hasMeta ? (
            <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap)}>
              {hasSubtitleRow ? (
                <div className={cn("flex min-w-0 gap-2", subtitleRight ? "items-start justify-between" : "items-center")}>
                  {shouldMergeSubtitleAndMeta ? (
                    <p className={cn("min-w-0 text-left [text-wrap:pretty] break-words", headerTokens.subtitleClassName, subtitleClassName)}>
                      <span className="align-middle">{resolvedSubtitle}</span>
                      <span className={cn("inline align-middle before:mx-1 before:inline-block before:content-['\\2022']", headerTokens.metaClassName)}>
                        {meta}
                      </span>
                    </p>
                  ) : resolvedSubtitle ? (
                    <div className={cn("min-w-0 text-left [text-wrap:pretty] break-words", headerTokens.subtitleClassName, subtitleClassName)}>{resolvedSubtitle}</div>
                  ) : <span />}
                  {subtitleRight ? (
                    <div className={cn("shrink-0 text-right", headerTokens.metaClassName)}>{subtitleRight}</div>
                  ) : null}
                </div>
              ) : null}
              {hasMeta && !shouldMergeSubtitleAndMeta ? (
                <div className={cn("text-left", headerTokens.metaClassName)}>{meta}</div>
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
