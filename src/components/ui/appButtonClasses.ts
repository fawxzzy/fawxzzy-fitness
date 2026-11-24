import { ACTION_CHROME_CONTROL_CLASS_NAME } from "@/components/ui/actionChrome";

// One button API (docs/ui/FOUNDATION.md). Canonical variants: primary, promote (green fill + the shared
// `.promote-shine` sweep), secondary, quiet, danger. The older names stay as aliases so no caller breaks:
// "tertiary" and "ghost" render as quiet, "destructive" renders as danger.
export type AppButtonCanonicalVariant = "primary" | "promote" | "secondary" | "quiet" | "danger";
export type AppButtonLegacyVariant = "destructive" | "tertiary" | "ghost";
export type AppButtonVariant = AppButtonCanonicalVariant | AppButtonLegacyVariant;
// Every size is at least 44px tall (--hit-min): lg 56, md 48, sm 44.
export type AppButtonSize = "lg" | "md" | "sm";
export type AppButtonState = "default" | "active";

export function normalizeAppButtonVariant(variant: AppButtonVariant): AppButtonCanonicalVariant {
  if (variant === "ghost" || variant === "tertiary") return "quiet";
  if (variant === "destructive") return "danger";
  return variant;
}

// The marker class keeps the historic names (tests and CSS read `app-button-tertiary` / `-destructive`).
const VARIANT_MARKER_CLASS_NAME: Record<AppButtonCanonicalVariant, string> = {
  primary: "app-button-primary",
  promote: "app-button-promote promote-shine",
  secondary: "app-button-secondary",
  quiet: "app-button-tertiary",
  danger: "app-button-destructive",
};

export function getAppButtonClassName({
  variant,
  size = "md",
  state = "default",
  fullWidth = false,
  focusRingClassName,
  className,
}: {
  variant: AppButtonVariant;
  size?: AppButtonSize;
  state?: AppButtonState;
  fullWidth?: boolean;
  focusRingClassName?: string;
  className?: string;
}) {
  const normalizedVariant = normalizeAppButtonVariant(variant);

  const sizeClassName =
    size === "lg"
      ? "app-button-lg min-h-[3.5rem]"
      : size === "sm"
        ? "app-button-sm min-h-[2.75rem]"
        : "app-button-md min-h-[3rem]";
  const resolvedFocusRingClassName =
    focusRingClassName
    ?? "focus-visible:ring-[var(--button-focus-ring)]";

  return [
    ACTION_CHROME_CONTROL_CLASS_NAME,
    "app-button",
    VARIANT_MARKER_CLASS_NAME[normalizedVariant],
    sizeClassName,
    resolvedFocusRingClassName,
    fullWidth ? "w-full" : "",
    state === "active" ? "shadow-[var(--action-chrome-shadow-hover)]" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
