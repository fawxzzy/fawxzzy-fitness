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
  const trailingNode = trailing ?? action;
  const hasSecondary = Boolean(subtitle || subtitleLeft || subtitleRight || meta);

  return (
    <header className={cn(headerTokens.horizontalPadding, headerTokens.contentBottomGap, "space-y-0", className)}>
      <div className={cn("flex items-start", headerTokens.primaryRowGap)}>
        <div className={cn("shrink-0", headerTokens.leadingSlot)}>{leading ?? null}</div>
        <div className="min-w-0 flex-1">
          {eyebrow ? <EyebrowText className="block">{eyebrow}</EyebrowText> : null}
          <TitleText as={titleAs} className={cn("block", headerTokens.titleClassName, titleClassName)}>{title}</TitleText>
          {hasSecondary ? (
            <div className={cn(headerTokens.titleToSecondaryGap, headerTokens.secondaryBlockGap)}>
              {subtitle ? <SubtitleText className="block">{subtitle}</SubtitleText> : null}
              {(subtitleLeft || subtitleRight) ? (
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {subtitleLeft ? <SubtitleText className="inline-flex">{subtitleLeft}</SubtitleText> : null}
                  {subtitleRight ? <SubtitleText className="inline-flex text-[rgb(var(--text)/0.54)]">{subtitleRight}</SubtitleText> : null}
                </div>
              ) : null}
              {meta ? <div>{meta}</div> : null}
            </div>
          ) : null}
        </div>
        <div className={cn("shrink-0", headerTokens.trailingSlot, actionClassName)}>{trailingNode ?? null}</div>
      </div>
    </header>
  );
}
