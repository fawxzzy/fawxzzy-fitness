import type { ButtonHTMLAttributes, ReactNode } from "react";
import { getAppButtonClassName, type AppButtonVariant } from "@/components/ui/appButtonClasses";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function AppButton({
  children,
  variant = "primary",
  fullWidth = false,
  loading = false,
  className,
  icon,
  disabled,
  ...props
}: AppButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      className={getAppButtonClassName({ variant, fullWidth, className })}
    >
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export function PrimaryButton(props: Omit<AppButtonProps, "variant">) {
  return <AppButton variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<AppButtonProps, "variant">) {
  return <AppButton variant="secondary" {...props} />;
}

export function DestructiveButton(props: Omit<AppButtonProps, "variant">) {
  return <AppButton variant="destructive" {...props} />;
}
