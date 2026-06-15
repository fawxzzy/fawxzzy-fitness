import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export const SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME = "max-w-[760px]";
export const SHARED_OVERLAY_PANEL_BREAKOUT_WIDTH_CLASS_NAME = "w-[min(calc(100vw-1rem),760px)]";
export const SHARED_OVERLAY_PANEL_COMPACT_VIEWPORT_CLASS_NAME = "max-h-[min(46dvh,28rem)] space-y-2.5";
export const SHARED_OVERLAY_PANEL_EXPANDED_VIEWPORT_CLASS_NAME = "max-h-[min(72dvh,44rem)] space-y-2.5";
export const SHARED_OVERLAY_PANEL_SURFACE_CLASS_NAME = cn(
  appTokens.exercisePickerFilterPanel,
  `relative isolate mx-auto w-full ${SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME} overflow-hidden !bg-[rgb(var(--bg-app))] shadow-[0_22px_60px_rgb(0_0_0_/0.42)] backdrop-blur-none`,
);
