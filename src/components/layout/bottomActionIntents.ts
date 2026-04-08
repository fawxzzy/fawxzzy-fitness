import {
  getAppButtonClassName,
  type AppButtonSize,
  type AppButtonState,
  type AppButtonVariant,
} from "@/components/ui/appButtonClasses";
import { ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { cn } from "@/lib/cn";

export type BottomActionIntent = "positive" | "info" | "toggleInactive" | "toggleActive" | "danger";
export type BottomDockButtonVariant = "primary" | "secondary" | "destructive";

export const BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME = [
  ACTION_CHROME_SEGMENTED_CLASS_NAME,
  "min-h-[3.1rem] rounded-[var(--action-chrome-segment-radius-compact)] px-4 text-sm font-semibold tracking-[0.01em]",
].join(" ");

const BOTTOM_ACTION_INTENT_FOCUS_RING_CLASS_NAMES: Record<BottomActionIntent, string> = {
  positive: "focus-visible:ring-emerald-300/28",
  info: "focus-visible:ring-sky-300/26",
  toggleInactive: "focus-visible:ring-amber-300/24",
  toggleActive: "focus-visible:ring-amber-300/26",
  danger: "focus-visible:ring-rose-300/26",
};

const LEGACY_VARIANT_TO_INTENT: Record<BottomDockButtonVariant, BottomActionIntent> = {
  primary: "positive",
  secondary: "info",
  destructive: "danger",
};

const INTENT_TO_APP_BUTTON_VARIANT: Record<BottomActionIntent, AppButtonVariant> = {
  positive: "primary",
  info: "secondary",
  toggleInactive: "secondary",
  toggleActive: "secondary",
  danger: "destructive",
};

export function resolveBottomActionIntent({
  intent,
  variant,
}: {
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
}): BottomActionIntent {
  if (intent) return intent;
  return LEGACY_VARIANT_TO_INTENT[variant ?? "primary"];
}

export function getBottomActionAppButtonVariant(intent: BottomActionIntent): AppButtonVariant {
  return INTENT_TO_APP_BUTTON_VARIANT[intent];
}

export function getBottomActionButtonClassName({
  intent,
  variant,
  size = "md",
  state = "default",
  fullWidth = true,
  className,
}: {
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
  size?: AppButtonSize;
  state?: AppButtonState;
  fullWidth?: boolean;
  className?: string;
}) {
  const resolvedIntent = resolveBottomActionIntent({ intent, variant });

  return getAppButtonClassName({
    variant: getBottomActionAppButtonVariant(resolvedIntent),
    size,
    state,
    fullWidth,
    focusRingClassName: BOTTOM_ACTION_INTENT_FOCUS_RING_CLASS_NAMES[resolvedIntent],
    className: cn(BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME, className),
  });
}
