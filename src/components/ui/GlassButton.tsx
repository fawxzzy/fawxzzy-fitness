"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function GlassButton({ children, className, type = "button", ...props }: GlassButtonProps) {
  return (
    <AppButton type={type} variant="secondary" size="sm" className={className} {...props}>
      {children}
    </AppButton>
  );
}

