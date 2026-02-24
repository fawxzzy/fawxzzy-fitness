export type AppButtonVariant = "primary" | "secondary" | "destructive";

export function getAppButtonClassName({
  variant,
  fullWidth = false,
  className,
}: {
  variant: AppButtonVariant;
  fullWidth?: boolean;
  className?: string;
}) {
  const variantClassName =
    variant === "primary"
      ? "border-[rgb(var(--button-primary-border))] bg-[rgb(var(--button-primary-bg))] text-[rgb(var(--button-primary-text))] hover:bg-[rgb(var(--button-primary-bg-hover))] active:bg-[rgb(var(--button-primary-bg-active))]"
      : variant === "destructive"
        ? "border-[rgb(var(--button-destructive-border))] bg-[rgb(var(--button-destructive-bg))] text-[rgb(var(--button-destructive-text))] hover:bg-[rgb(var(--button-destructive-bg-hover))] active:bg-[rgb(var(--button-destructive-bg-active))]"
        : "border-[rgb(var(--button-secondary-border))] bg-[rgb(var(--button-secondary-bg))] text-[rgb(var(--button-secondary-text))] hover:bg-[rgb(var(--button-secondary-bg-hover))] active:bg-[rgb(var(--button-secondary-bg-active))]";

  return [
    "app-button inline-flex items-center justify-center gap-2 border text-center leading-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60",
    fullWidth ? "w-full" : "",
    variantClassName,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
