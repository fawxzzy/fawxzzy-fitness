export type AppButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type AppButtonSize = "md" | "sm";
export type AppButtonState = "default" | "active";

export function getAppButtonClassName({
  variant,
  size = "md",
  state = "default",
  fullWidth = false,
  className,
}: {
  variant: AppButtonVariant;
  size?: AppButtonSize;
  state?: AppButtonState;
  fullWidth?: boolean;
  className?: string;
}) {
  const resolvedVariant = state === "active" && variant !== "destructive" ? "primary" : variant;

  const variantClassName =
    resolvedVariant === "primary"
      ? "border-[rgb(var(--button-primary-border))] bg-[rgb(var(--button-primary-bg))] text-[rgb(var(--button-primary-text))] hover:bg-[rgb(var(--button-primary-bg-hover))] active:bg-[rgb(var(--button-primary-bg-active))]"
      : resolvedVariant === "destructive"
        ? "border-[rgb(var(--button-destructive-border))] bg-[rgb(var(--button-destructive-bg))] text-[rgb(var(--button-destructive-text))] hover:bg-[rgb(var(--button-destructive-bg-hover))] active:border-[rgb(var(--button-destructive-border))] active:bg-[rgb(var(--button-destructive-bg-active))] active:shadow-[0_0_0_1px_rgb(var(--button-destructive-border)/0.35)]"
        : resolvedVariant === "ghost"
          ? "border-[rgb(var(--button-ghost-border))] bg-[rgb(var(--button-ghost-bg))] text-[rgb(var(--button-ghost-text))] hover:bg-[rgb(var(--button-ghost-bg-hover))] active:bg-[rgb(var(--button-ghost-bg-active))]"
          : "border-[rgb(var(--button-secondary-border))] bg-[rgb(var(--button-secondary-bg))] text-[rgb(var(--button-secondary-text))] hover:bg-[rgb(var(--button-secondary-bg-hover))] active:bg-[rgb(var(--button-secondary-bg-active))]";

  const sizeClassName = size === "sm" ? "app-button-sm" : "app-button-md";
  const focusRingClassName =
    resolvedVariant === "destructive"
      ? "focus-visible:ring-red-500/35"
      : "focus-visible:ring-[var(--button-focus-ring)]";

  return [
    "app-button inline-flex items-center justify-center gap-2 border text-center leading-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
    sizeClassName,
    focusRingClassName,
    fullWidth ? "w-full" : "",
    variantClassName,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
