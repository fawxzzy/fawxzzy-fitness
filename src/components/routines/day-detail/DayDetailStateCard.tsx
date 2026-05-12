import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { EyebrowText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

type DayDetailStateTone = "rest" | "warning" | "blocking" | "neutral";

const toneClassNames: Record<DayDetailStateTone, string> = {
  rest: appTokens.detailStateRest,
  warning: appTokens.detailStateWarning,
  blocking: appTokens.detailStateBlocking,
  neutral: appTokens.detailStateNeutral,
};

export function DayDetailStateCard({
  title,
  body,
  meta,
  tone = "neutral",
  className,
}: {
  title: ReactNode;
  body: ReactNode;
  meta?: ReactNode;
  tone?: DayDetailStateTone;
  className?: string;
}) {
  return (
    <div className={cn(appTokens.detailStateCard, toneClassNames[tone], className)}>
      <EyebrowText as="p">{title}</EyebrowText>
      <p className={appTokens.detailBodyText}>{body}</p>
      {meta ? <div className={cn(appTokens.detailMetaText, "opacity-90")}>{meta}</div> : null}
    </div>
  );
}
