import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  getAppButtonClassName,
  type AppButtonSize,
  type AppButtonState,
  type AppButtonVariant,
} from "@/components/ui/appButtonClasses";
import { resolveAppButtonIntent } from "@/components/ui/actionChrome";

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  state?: AppButtonState;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  "data-action-chrome-intent"?: string;
  "data-action-chrome-selected"?: string;
  "data-action-chrome-segmented"?: string;
};

export function AppButton({
  children,
  variant = "primary",
  size = "md",
  state = "default",
  fullWidth = false,
  loading = false,
  className,
  icon,
  disabled,
  ...props
}: AppButtonProps) {
  const resolvedIntent = resolveAppButtonIntent({ variant, state });
  const providedIntent = props["data-action-chrome-intent"] as string | undefined;
  const providedSelectedState = props["data-action-chrome-selected"] as string | undefined;

  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading}
      data-action-chrome-intent={providedIntent ?? resolvedIntent}
      data-action-chrome-selected={providedSelectedState ?? (state === "active" ? "true" : undefined)}
      className={getAppButtonClassName({ variant, size, state, fullWidth, className })}
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

export function GhostButton(props: Omit<AppButtonProps, "variant">) {
  return <AppButton variant="ghost" {...props} />;
}
