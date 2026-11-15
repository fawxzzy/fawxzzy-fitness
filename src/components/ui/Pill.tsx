import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { HIT_AREA_CLASS_NAME } from "@/components/ui/hitArea";

type SharedProps = {
  active?: boolean;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
};

const toneClassNames: Record<NonNullable<SharedProps["tone"]>, string> = {
  default: "border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-3-rgb)/0.9)] text-[rgb(var(--text-primary)/0.88)]",
  success: "border-[rgb(var(--success-rgb)/0.32)] bg-[rgb(var(--success-rgb)/0.14)] text-[rgb(var(--text-primary))]",
  warning: "border-[rgb(var(--warning-rgb)/0.34)] bg-[rgb(var(--warning-rgb)/0.14)] text-[rgb(255_242_220)]",
  destructive: "border-[rgb(var(--danger-rgb)/0.22)] bg-[rgb(var(--surface-3-rgb)/0.92)] text-[rgb(var(--danger-rgb)/0.96)]",
};

export function Pill({ active, tone = "default", className, ...props }: HTMLAttributes<HTMLSpanElement> & SharedProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        active ? "border-[rgb(var(--accent)/0.36)] bg-[rgb(var(--accent)/0.14)] text-[rgb(var(--text-primary))]" : toneClassNames[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * Tappable pill. The default is a real 44px-tall control (`min-h-11`), which is the only version that is safe inside
 * horizontal filter rails (the rail clips overflow) and wrapped rows (a neighbour's hit layer would overlap). Pass
 * `hitSlop` only for an isolated pill whose visible shape must stay small; it pads the target with an invisible layer.
 */
export function PillButton({ active, tone = "default", hitSlop = false, className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & SharedProps & { hitSlop?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        hitSlop ? HIT_AREA_CLASS_NAME : "min-h-11",
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
        active
          ? "border-[rgb(var(--accent)/0.38)] bg-[rgb(var(--accent)/0.16)] text-[rgb(var(--text-primary))]"
          : cn(toneClassNames[tone], "hover:border-[rgb(var(--border-strong)/0.28)] hover:bg-[rgb(var(--surface-2)/0.98)] hover:text-[rgb(var(--text-primary))]"),
        className,
      )}
      {...props}
    />
  );
}
