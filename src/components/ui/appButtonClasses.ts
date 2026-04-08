import { ACTION_CHROME_CONTROL_CLASS_NAME } from "@/components/ui/actionChrome";

export type AppButtonVariant = "primary" | "secondary" | "destructive" | "ghost";
export type AppButtonSize = "md" | "sm";
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
  void variant;

  const sizeClassName = size === "sm" ? "app-button-sm min-h-[2.125rem]" : "app-button-md min-h-[2.75rem]";
  const resolvedFocusRingClassName =
    focusRingClassName
    ?? "focus-visible:ring-[var(--button-focus-ring)]";

  return [
    ACTION_CHROME_CONTROL_CLASS_NAME,
    "app-button",
    sizeClassName,
    resolvedFocusRingClassName,
    fullWidth ? "w-full" : "",
    state === "active" ? "shadow-[var(--action-chrome-shadow-hover)]" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}
