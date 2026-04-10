import type { ButtonHTMLAttributes } from "react";
import { AppButton } from "@/components/ui/AppButton";
import type { AppButtonSize, AppButtonVariant } from "@/components/ui/appButtonClasses";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "danger";

export function Button({
  variant = "secondary",
  type = "button",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: AppButtonSize }) {
  const mappedVariant: AppButtonVariant =
    variant === "danger"
      ? "destructive"
      : variant === "ghost"
        ? "tertiary"
        : variant;

  return (
    <AppButton
      {...props}
      type={type}
      variant={mappedVariant}
      size={size}
    />
  );
}
