"use client";

import type { ReactNode } from "react";

type GlassProps = {
  variant?: "base" | "raised" | "overlay" | "solid";
  className?: string;
  children: ReactNode;
  interactive?: boolean;
};

const variantClassMap: Record<NonNullable<GlassProps["variant"]>, string> = {
  base: "[--glass-blur:var(--glass-current-blur-base)] [--glass-shadow:var(--glass-shadow-base)]",
  raised: "[--glass-blur:var(--glass-current-blur-raised)] [--glass-shadow:var(--glass-shadow-raised)]",
  overlay: "[--glass-blur:var(--glass-current-blur-overlay)] [--glass-shadow:var(--glass-shadow-overlay)]",
  solid: "glass-solid [--glass-blur:var(--glass-blur-off)] [--glass-shadow:var(--glass-shadow-base)] [--glass-current-tint-alpha:0.9]",
};

export function Glass({ variant = "base", className, children, interactive = false }: GlassProps) {
  return (
    <div className={`glass-surface ${variantClassMap[variant]} ${variant !== "solid" ? "glass-sheen" : ""} ${interactive ? "glass-interactive" : ""} ${className ?? ""}`}>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

