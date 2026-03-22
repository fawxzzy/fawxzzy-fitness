import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";

export function SessionHeaderCard({
  eyebrow,
  title,
  subtitle,
  meta,
  action,
  footer,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.045))] px-3.5 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.2)] backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? <EyebrowText>{eyebrow}</EyebrowText> : null}
          <TitleText as="h1" className="text-[1.08rem]">{title}</TitleText>
          {subtitle ? <SubtitleText>{subtitle}</SubtitleText> : null}
        </div>
        {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
      </div>

      {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
      {footer ? <div className="mt-1.5 min-h-[1rem] px-0.5 text-xs text-muted">{footer}</div> : null}
    </section>
  );
}
