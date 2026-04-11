import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type DayDetailStateTone = "rest" | "warning" | "blocking" | "neutral";

const toneClassNames: Record<DayDetailStateTone, string> = {
  rest: "border-[rgb(var(--warning-rgb)/0.28)] bg-[rgb(var(--warning-rgb)/0.1)] text-[rgb(255_242_220)]",
  warning: "border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(var(--accent-yellow-on))]",
  blocking: "border-[rgb(var(--accent-red)/0.34)] bg-[rgb(var(--accent-red)/0.12)] text-[rgb(var(--button-destructive-text))]",
  neutral: "border border-border/45 bg-surface/52 text-muted",
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
    <div className={cn("space-y-1.5 rounded-[1rem] border px-3 py-3", toneClassNames[tone], className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{title}</p>
      <p className="text-sm leading-6">{body}</p>
      {meta ? <div className="text-xs leading-5 opacity-90">{meta}</div> : null}
    </div>
  );
}
