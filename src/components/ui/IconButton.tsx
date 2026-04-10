import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { cn } from "@/lib/cn";

export function IconButton({
  children,
  className,
  size = "sm",
  variant = "secondary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  size?: "sm" | "md";
  variant?: "secondary" | "tertiary" | "destructive";
}) {
  const squareSize = size === "md" ? "min-h-12 min-w-12 px-0" : "min-h-10 min-w-10 px-0";

  return (
    <AppButton
      {...props}
      variant={variant}
      size={size}
      className={cn(squareSize, "shrink-0", className)}
    >
      {children}
    </AppButton>
  );
}
