import type { AppButtonVariant } from "@/components/ui/appButtonClasses";

export type BottomActionIntent = "positive" | "info" | "toggleInactive" | "toggleActive" | "danger";
export type BottomDockButtonVariant = "primary" | "secondary" | "destructive";

export const BOTTOM_ACTION_INTENT_CLASS_NAMES: Record<BottomActionIntent, string> = {
  positive:
    "!border-emerald-300/55 !bg-emerald-500/30 !text-emerald-50 !shadow-[0_10px_26px_rgba(16,185,129,0.2)] hover:!bg-emerald-500/36 active:!bg-emerald-500/42",
  info:
    "!border-sky-300/45 !bg-sky-500/18 !text-sky-50 !shadow-[0_10px_26px_rgba(14,165,233,0.15)] hover:!bg-sky-500/24 active:!bg-sky-500/30",
  toggleInactive:
    "!border-amber-300/36 !bg-amber-400/10 !text-amber-100/88 !shadow-none hover:!bg-amber-400/14 active:!bg-amber-400/18",
  toggleActive:
    "!border-amber-300/55 !bg-amber-400/20 !text-amber-50 !shadow-[0_10px_24px_rgba(245,158,11,0.17)] hover:!bg-amber-400/26 active:!bg-amber-400/32",
  danger:
    "!border-rose-300/40 !bg-rose-500/18 !text-rose-100 !shadow-[0_10px_24px_rgba(190,24,93,0.16)] hover:!bg-rose-500/24 active:!bg-rose-500/28",
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
