import { ACTION_CHROME_CONTROL_CLASS_NAME } from "@/components/ui/actionChrome";

export type AppButtonVariant = "primary" | "secondary" | "destructive" | "tertiary" | "ghost";
export type AppButtonSize = "lg" | "md" | "sm";
export type AppButtonState = "default" | "active";

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
  const normalizedVariant = variant === "ghost" ? "tertiary" : variant;

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
    `app-button-${normalizedVariant}`,
    sizeClassName,
    resolvedFocusRingClassName,
    fullWidth ? "w-full" : "",
    state === "active" ? "shadow-[var(--action-chrome-shadow-hover)]" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
