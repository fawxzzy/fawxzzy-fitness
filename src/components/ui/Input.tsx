import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] border border-[rgb(var(--border)/0.22)] bg-[rgb(var(--surface-2)/0.92)] px-4 py-2.5 text-[15px] text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted)/0.92)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] focus-visible:border-[rgb(var(--accent)/0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]",
        className,
      )}
      {...props}
    />
  );
}
