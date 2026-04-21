import type { ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { fitnessDesignPrimitiveClassNames } from "@/components/ui/app/designSystem";
import { cn } from "@/lib/cn";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";

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
    <section className={cn(appTokens.exerciseLogHeaderPanel, className)}>
      {eyebrow ? <EyebrowText className="mb-2 block">{eyebrow}</EyebrowText> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="min-w-0 space-y-1.5">
            <TitleText as="h1" className={fitnessDesignPrimitiveClassNames.headerFamily.titleClassName}>{title}</TitleText>
            {subtitle ? <SubtitleText className={cn("leading-snug", appTokens.mutedText)}>{subtitle}</SubtitleText> : null}
          </div>
          {meta && metaBelowTitle ? <div className="flex min-h-0 items-center">{meta}</div> : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
        {meta && !metaBelowTitle ? <div className="shrink-0 self-center">{meta}</div> : null}
      </div>

      {footer ? <div className={cn(fitnessDesignPrimitiveClassNames.headerFamily.dividerClassName, "text-xs text-muted")}>{footer}</div> : null}
    </section>
  );
}
