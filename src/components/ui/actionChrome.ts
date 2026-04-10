import type { AppButtonState, AppButtonVariant } from "@/components/ui/appButtonClasses";

export type ActionChromeIntent =
  | "neutral"
  | "positive"
  | "info"
  | "toggleInactive"
  | "toggleActive"
  | "danger"
  | "ghost";

export const ACTION_CHROME_RAIL_CLASS_NAME =
  "action-chrome-rail";

export const ACTION_CHROME_RAIL_GRID_CLASS_NAME =
  "grid items-stretch gap-[var(--action-chrome-shell-gap)]";

export const ACTION_CHROME_CONTROL_CLASS_NAME = [
  "action-chrome",
  "inline-flex items-center justify-center gap-2 border text-center leading-none",
  "[-webkit-tap-highlight-color:transparent]",
  "focus-visible:outline-none focus-visible:ring-2",
  "disabled:cursor-not-allowed disabled:opacity-60",
].join(" ");

export const ACTION_CHROME_SEGMENTED_CLASS_NAME = "action-chrome-segmented";

export function resolveAppButtonIntent({
  variant,
  state = "default",
}: {
  variant: AppButtonVariant;
  state?: AppButtonState;
}): ActionChromeIntent {
  if (variant === "destructive") return "danger";
  if (variant === "ghost" || variant === "tertiary") return "ghost";
  if (state === "active") return "positive";
  if (variant === "primary") return "positive";
  return "neutral";
}

export function resolveSimpleButtonIntent(variant: "primary" | "secondary" | "tertiary" | "ghost" | "danger"): ActionChromeIntent {
  if (variant === "primary") return "positive";
  if (variant === "danger") return "danger";
  if (variant === "ghost" || variant === "tertiary") return "ghost";
  return "neutral";
}
