import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";
import { standaloneHeaderFamily } from "@/components/ui/app/standaloneHeaderFamily";

export function SessionHeaderCard({
  eyebrow,
  title,
  subtitle,
  meta,
  metaBelowTitle = false,
  action,
  footer,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  metaBelowTitle?: boolean;
  action?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden border bg-[rgb(var(--surface-2-soft)/0.74)] px-4 pb-4 pt-6 backdrop-blur-md",
        standaloneHeaderFamily.panelClassName,
        className,
      )}
    >
      {eyebrow ? <EyebrowText className="mb-2 block">{eyebrow}</EyebrowText> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0 space-y-1.5">
            <TitleText as="h1" className={standaloneHeaderFamily.titleClassName}>{title}</TitleText>
            {subtitle ? <SubtitleText className="leading-snug text-[rgb(var(--text)/0.72)]">{subtitle}</SubtitleText> : null}
          </div>
          {meta && metaBelowTitle ? <div className="flex min-h-0 items-center">{meta}</div> : null}
        </div>
        {action ? <div className={cn("shrink-0 self-start", standaloneHeaderFamily.actionClassName)}>{action}</div> : null}
        {meta && !metaBelowTitle ? <div className="shrink-0 self-center">{meta}</div> : null}
      </div>

      {footer ? <div className="mt-2.5 border-t border-white/10 pt-2 text-xs text-muted">{footer}</div> : null}
    </section>
  );
}
