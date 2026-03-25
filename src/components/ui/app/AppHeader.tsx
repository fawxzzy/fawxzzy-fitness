import type { ReactNode } from "react";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";

export function AppHeader({
  eyebrow,
  title,
  subtitleLeft,
  subtitleRight,
  action,
  className,
  actionClassName,
  titleClassName,
  titleAs = "h1",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitleLeft?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
  className?: string;
  actionClassName?: string;
  titleClassName?: string;
  titleAs?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={["flex items-start justify-between gap-4", className].filter(Boolean).join(" ")}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? <EyebrowText className="block">{eyebrow}</EyebrowText> : null}
        <TitleText as={titleAs} className={["block text-xl font-semibold tracking-[-0.01em]", titleClassName].filter(Boolean).join(" ")}>{title}</TitleText>
        {(subtitleLeft || subtitleRight) ? (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm">
            {subtitleLeft ? <SubtitleText className="inline-flex">{subtitleLeft}</SubtitleText> : null}
            {subtitleRight ? <SubtitleText className="inline-flex text-[rgb(var(--text)/0.54)]">{subtitleRight}</SubtitleText> : null}
          </div>
        ) : null}
      </div>
      {action ? <div className={["shrink-0 self-start", actionClassName].filter(Boolean).join(" ")}>{action}</div> : null}
    </div>
  );
}
