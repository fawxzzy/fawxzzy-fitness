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
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitleLeft?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
  className?: string;
  actionClassName?: string;
  titleClassName?: string;
}) {
  return (
    <div className={["flex items-start justify-between gap-3.5", className].filter(Boolean).join(" ")}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <EyebrowText>{eyebrow}</EyebrowText> : null}
        <TitleText as="h2" className={["text-lg font-semibold", titleClassName].filter(Boolean).join(" ")}>{title}</TitleText>
        {(subtitleLeft || subtitleRight) ? (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            {subtitleLeft ? <SubtitleText>{subtitleLeft}</SubtitleText> : null}
            {subtitleRight ? <SubtitleText className="text-[rgb(var(--text)/0.54)]">{subtitleRight}</SubtitleText> : null}
          </div>
        ) : null}
      </div>
      {action ? <div className={["shrink-0 self-start pt-0.5", actionClassName].filter(Boolean).join(" ")}>{action}</div> : null}
    </div>
  );
}
