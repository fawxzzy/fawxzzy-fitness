import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "warning" | "danger";

const infoToneClassNames: Record<Tone, string> = {
  default: appTokens.curatedInfoCardDefault,
  accent: appTokens.curatedInfoCardAccent,
  warning: appTokens.curatedInfoCardWarning,
  danger: appTokens.curatedInfoCardDanger,
};

export function CuratedInfoCard({
  children,
  className,
  compact = false,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  compact?: boolean;
  tone?: Tone;
}) {
  return (
    <div
      {...props}
      className={cn(
        appTokens.curatedInfoCard,
        compact ? appTokens.curatedInfoCardCompact : undefined,
        infoToneClassNames[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CuratedOptionCard({
  children,
  className,
  selected,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  selected: boolean;
}) {
  return (
    <button
      {...props}
      type={type}
      className={cn(
        appTokens.curatedOptionCard,
        selected ? appTokens.curatedOptionCardSelected : appTokens.curatedOptionCardDefault,
        className,
      )}
    >
      {children}
    </button>
  );
}
