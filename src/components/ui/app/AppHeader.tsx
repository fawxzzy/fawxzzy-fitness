import type { ReactNode } from "react";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";

export function AppHeader({
  title,
  subtitleLeft,
  subtitleRight,
  action,
  className,
  actionClassName,
}: {
  title: ReactNode;
  subtitleLeft?: ReactNode;
  subtitleRight?: ReactNode;
  action?: ReactNode;
  className?: string;
  actionClassName?: string;
}) {
  return (
    <div className={["flex items-start justify-between gap-3", className].filter(Boolean).join(" ")}>
      <div className="min-w-0 space-y-1">
        <TitleText as="h2" className="text-xl font-bold">{title}</TitleText>
        {(subtitleLeft || subtitleRight) ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {subtitleLeft ? <SubtitleText>{subtitleLeft}</SubtitleText> : null}
            {subtitleRight ? <SubtitleText className="text-[rgb(var(--text)/0.54)]">{subtitleRight}</SubtitleText> : null}
          </div>
        ) : null}
      </div>
      {action ? <div className={["shrink-0 pt-0.5", actionClassName].filter(Boolean).join(" ")}>{action}</div> : null}
    </div>
  );
}
