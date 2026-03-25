import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SharedProps = {
  active?: boolean;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
};

const toneClassNames: Record<NonNullable<SharedProps["tone"]>, string> = {
  default: "border-border/40 bg-[rgb(var(--bg)/0.34)] text-[rgb(var(--text)/0.78)]",
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-400/34 bg-amber-400/10 text-amber-100",
  destructive: "border-rose-400/36 bg-rose-400/12 text-rose-100",
};

export function Pill({ active, tone = "default", className, ...props }: HTMLAttributes<HTMLSpanElement> & SharedProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        active ? "border-emerald-400/34 bg-emerald-400/12 text-emerald-100" : toneClassNames[tone],
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
        "inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25",
        active
          ? "border-emerald-400/40 bg-emerald-400/12 text-emerald-100"
          : cn(toneClassNames[tone], "hover:border-border/60 hover:bg-[rgb(var(--bg)/0.45)] hover:text-text"),
        className,
      )}
      {...props}
    />
  );
}
