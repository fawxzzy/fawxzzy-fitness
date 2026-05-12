import { ACTION_CHROME_CONTROL_CLASS_NAME, type ActionChromeIntent } from "@/components/ui/actionChrome";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export function getMeasurementToggleIntent(isActive: boolean): ActionChromeIntent {
  return isActive ? "toggleActive" : "toggleInactive";
}

export function getMeasurementToggleButtonClassName() {
  return cn(
    ACTION_CHROME_CONTROL_CLASS_NAME,
    appTokens.currentSessionWarmupToggle,
    "measurement-toggle-button flex h-[3.05rem] min-h-[3.05rem] w-full translate-y-[5px] flex-col items-center justify-center rounded-[1rem] border px-3 py-0 text-center leading-none shadow-none focus-visible:ring-[var(--button-focus-ring)] [&_.measurement-toggle__label]:mx-auto [&_.measurement-toggle__label]:block [&_.measurement-toggle__label]:w-full [&_.measurement-toggle__label]:text-center",
  );
}
