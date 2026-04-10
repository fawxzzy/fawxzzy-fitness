import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export function SearchField({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted)/0.92)]">
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="7" cy="7" r="4.25" />
          <path d="M10.5 10.5L13.5 13.5" strokeLinecap="round" />
        </svg>
      </span>
      <Input className="pl-10" type="search" {...props} />
    </div>
  );
}
