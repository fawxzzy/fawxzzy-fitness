"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function GlassButton({ children, className, type = "button", ...props }: GlassButtonProps) {
  return (
    <button
      type={type}
      className={`glass-surface glass-sheen glass-interactive inline-flex items-center justify-center rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 active:scale-[0.985] motion-reduce:active:scale-100 ${className ?? ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

