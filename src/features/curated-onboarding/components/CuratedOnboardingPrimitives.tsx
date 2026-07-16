import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "warning" | "danger";

const infoToneClassNames: Record<Tone, string> = {
  default: "border-[rgb(var(--border-strong)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.34)]",
  accent: "border-[rgb(var(--accent)/0.34)] bg-[linear-gradient(100deg,rgb(var(--accent)/0.12),rgb(var(--surface-1-rgb)/0.42)_48%,rgb(var(--surface-1-rgb)/0.28))] before:bg-[rgb(var(--accent))]",
  warning: "border-[rgb(var(--warning-rgb)/0.34)] bg-[rgb(var(--warning-rgb)/0.08)] before:bg-[rgb(var(--warning-rgb))]",
  danger: "border-[rgb(var(--danger-rgb)/0.38)] bg-[rgb(var(--danger-rgb)/0.09)] before:bg-[rgb(var(--danger-rgb))]",
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
    <AppPanel
      {...props}
      className={cn(
        "relative !overflow-hidden border shadow-[0_10px_24px_rgba(0,0,0,0.12)]",
        tone === "default" ? undefined : "before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
        compact ? "px-3 py-2.5" : "px-3.5 py-3.5 sm:px-4 sm:py-4",
        infoToneClassNames[tone],
        className,
      )}
    >
      {children}
    </AppPanel>
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
      aria-pressed={selected}
      data-curated-option="true"
      className={cn(
        "relative flex min-h-14 w-full items-center overflow-hidden rounded-[var(--card-radius)] border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.24)]",
        selected
          ? "border-[rgb(var(--accent)/0.48)] bg-[linear-gradient(100deg,rgb(var(--accent)/0.16),rgb(var(--surface-1-rgb)/0.46)_58%,rgb(var(--surface-1-rgb)/0.3))] shadow-[0_0_0_1px_rgb(var(--accent)/0.1),0_12px_26px_rgba(0,0,0,0.16)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[rgb(var(--accent))]"
          : "border-[rgb(var(--border-strong)/0.22)] bg-[rgb(var(--surface-1-rgb)/0.32)] shadow-[0_8px_20px_rgba(0,0,0,0.1)] hover:border-[rgb(var(--accent)/0.32)] hover:bg-[rgb(var(--surface-1-rgb)/0.44)]",
        className,
      )}
    >
      {children}
    </button>
  );
}
