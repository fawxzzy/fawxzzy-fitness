import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

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

export function PillButton({ active, tone = "default", className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & SharedProps) {
  return (
    <button
      type={type}
      className={cn(
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
