import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { EyebrowText } from "@/components/ui/text-roles";
import { cn } from "@/lib/cn";

type DayDetailStateTone = "rest" | "warning" | "blocking" | "neutral";

const toneClassNames: Record<DayDetailStateTone, string> = {
  rest: "border-[rgb(var(--warning-rgb)/0.28)] bg-[rgb(var(--warning-rgb)/0.1)] text-[rgb(255_242_220)]",
  warning: "border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(var(--accent-yellow-on))]",
  blocking: "border-[rgb(var(--accent-red)/0.34)] bg-[rgb(var(--accent-red)/0.12)] text-[rgb(var(--button-destructive-text))]",
  neutral: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.52)] text-[rgb(var(--text-secondary)/0.96)]",
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
