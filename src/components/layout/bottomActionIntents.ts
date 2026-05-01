import { cn } from "@/lib/cn";

export type BottomActionIntent = "positive" | "info" | "toggleInactive" | "toggleActive" | "danger";
export type BottomDockButtonVariant = "primary" | "secondary" | "destructive";

export const BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME = [
  "bottom-action",
  "relative inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[var(--bottom-action-radius)] border px-3.5 text-center text-[0.925rem] font-semibold leading-[1.08] tracking-[0.01em]",
  "[-webkit-tap-highlight-color:transparent]",
  "focus-visible:outline-none",
].join(" ");

const LEGACY_VARIANT_TO_INTENT: Record<BottomDockButtonVariant, BottomActionIntent> = {
  primary: "positive",
  secondary: "info",
  destructive: "danger",
};

const INTENT_TO_BOTTOM_ACTION_CLASS_NAME: Record<BottomActionIntent, string> = {
  positive: "bottom-action--primary",
  info: "bottom-action--secondary",
  toggleInactive: "bottom-action--secondary",
  toggleActive: "bottom-action--secondary",
  danger: "bottom-action--secondary",
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

export function getBottomActionButtonClassName({
  intent,
  variant,
  size: _size = "md",
  state: _state = "default",
  fullWidth = true,
  className,
}: {
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
  size?: "lg" | "md" | "sm";
  state?: "default" | "active";
  fullWidth?: boolean;
  className?: string;
}) {
  const resolvedIntent = resolveBottomActionIntent({ intent, variant });

  return cn(
    BOTTOM_ACTION_BUTTON_BASE_CLASS_NAME,
    INTENT_TO_BOTTOM_ACTION_CLASS_NAME[resolvedIntent],
    fullWidth ? "w-full" : "",
    className,
  );
}
