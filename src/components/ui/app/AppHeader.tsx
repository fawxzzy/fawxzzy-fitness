import { isValidElement, type ReactNode } from "react";
import { MetricAccentBar } from "@/components/ui/MetricItem";
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
  separatorClassName,
  align = "left",
  titleAs = "h1",
  showSeparator = true,
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
  separatorClassName?: string;
  align?: "left" | "center";
  titleAs?: "h1" | "h2" | "h3";
  showSeparator?: boolean;
}) {
  const resolvedSubtitle = subtitle ?? subtitleLeft;
  const hasSubtitleRow = Boolean(resolvedSubtitle || subtitleRight);
  const hasMeta = Boolean(meta);
  const isTitleOnlyHeader = !eyebrow && !hasSubtitleRow && !hasMeta;
  const actionNode = action ?? leading;
  const shouldMergeSubtitleAndMeta = !subtitleRight && Boolean(resolvedSubtitle) && hasMeta;
  const hasRightRail = Boolean(actionNode || trailing);
  const shouldRenderRawTitle = isValidElement<{ "data-app-header-raw-title"?: string }>(title)
    && title.props["data-app-header-raw-title"] === "true";

  const isCentered = align === "center";
  const copyStackAlignmentClassName = isCentered ? "items-center text-center" : "items-start text-left";
  const copyColumnClassName = isCentered
    ? cn(
      "mx-auto w-fit min-w-0 flex-none",
      hasRightRail
        ? "max-w-[calc(100%-4.85rem)] px-[1.75rem] sm:max-w-[calc(100%-5.4rem)] sm:px-[2.1rem]"
        : "max-w-[calc(100%-1rem)] px-1",
    )
    : "flex-1";
  const copyStackClassName = isCentered
    ? "inline-flex min-w-0 max-w-full flex-col"
    : "flex min-w-0 w-full max-w-full flex-col";
  const separatorBarNode = (
    <MetricAccentBar
      variant="thin"
      className={cn("mt-2 w-full max-w-full self-stretch", isCentered ? "mx-auto" : "", separatorClassName)}
    />
  );

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex", isCentered ? "relative justify-center" : "justify-between", isTitleOnlyHeader ? "items-center" : "items-start", headerTokens.primaryRowGap)}>
        <div className={cn("min-w-0", copyColumnClassName)}>
          <div className={cn(copyStackClassName, copyStackAlignmentClassName)}>
            {eyebrow ? <EyebrowText className={cn("block", isCentered ? "text-center" : "text-left", headerTokens.eyebrowClassName)}>{eyebrow}</EyebrowText> : null}
            {shouldRenderRawTitle ? (
              <div className={cn("block max-w-full px-1 sm:px-0", isCentered ? "text-center" : "text-left", titleClassName)}>
                {title}
              </div>
            ) : (
              <TitleText as={titleAs} className={cn("block max-w-full break-words px-1 leading-tight [text-wrap:balance] sm:px-0", isCentered ? "text-center" : "text-left", headerTokens.titleClassName, headerTokens.titleTextClassName, titleClassName)}>{title}</TitleText>
            )}
            {hasSubtitleRow || hasMeta ? (
              <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap, "w-full")}>
                {hasSubtitleRow ? (
                  <div className={cn("flex min-w-0 gap-2", subtitleRight ? "items-start justify-between" : isCentered ? "items-center justify-center" : "items-center")}>
                    {shouldMergeSubtitleAndMeta ? (
                      <p className={cn("min-w-0 break-words px-1 [text-wrap:pretty] sm:px-0", isCentered ? "text-center" : "text-left", headerTokens.subtitleClassName, subtitleClassName)}>
                        <span className="align-middle">{resolvedSubtitle}</span>
                        <span className={cn("inline align-middle before:mx-1 before:inline-block before:content-['\\2022']", headerTokens.metaClassName)}>
                          {meta}
                        </span>
                      </p>
                    ) : resolvedSubtitle ? (
                      <div className={cn("min-w-0 break-words px-1 [text-wrap:pretty] sm:px-0", isCentered ? "text-center" : "text-left", headerTokens.subtitleClassName, subtitleClassName)}>{resolvedSubtitle}</div>
                    ) : <span />}
                    {subtitleRight ? (
                      <div className={cn("shrink-0 text-right", headerTokens.metaClassName)}>{subtitleRight}</div>
                    ) : null}
                  </div>
                ) : null}
                {hasMeta && !shouldMergeSubtitleAndMeta ? (
                  <div className={cn(isCentered ? "text-center" : "text-left", headerTokens.metaClassName)}>{meta}</div>
                ) : null}
              </div>
            ) : null}
            {showSeparator ? separatorBarNode : null}
          </div>
        </div>
        {(actionNode || trailing) ? (
          <div
            className={cn(
              "shrink-0 flex items-center",
              headerTokens.actionRailGap,
              actionClassName,
              isCentered ? (isTitleOnlyHeader ? "absolute right-0 top-1/2 -translate-y-1/2" : "absolute right-0 top-0") : "",
            )}
          >
            {actionNode ? <div>{actionNode}</div> : null}
            {trailing ? <div className={headerTokens.trailingSlot}>{trailing}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
