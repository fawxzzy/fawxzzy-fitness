import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";

export function PickerListViewport({
  children,
  className,
  viewportClassName,
  showFade = true,
  constrainOnDesktop = false,
  plainOnMobile = false,
  mobileTray = false,
  viewportProps,
}: {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  showFade?: boolean;
  constrainOnDesktop?: boolean;
  plainOnMobile?: boolean;
  mobileTray?: boolean;
  viewportProps?: Omit<ComponentPropsWithoutRef<"div">, "children" | "className">;
}) {
  const shouldShowDesktopFade = showFade && constrainOnDesktop;
  const shouldShowMobileFade = showFade && mobileTray;
  const shellClassName = plainOnMobile
    ? appTokens.exercisePickerViewportShell
    : "relative overflow-hidden rounded-[1.35rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-2";

  return (
    <div
      className={cn(
        shellClassName,
        mobileTray
          ? appTokens.exercisePickerViewportTray
          : undefined,
        className,
      )}
    >
      <div
        {...viewportProps}
        className={cn(
          "picker-scroll-viewport w-full min-w-0",
          plainOnMobile ? "overflow-visible pr-0 md:overflow-y-auto md:overscroll-contain md:pr-1" : "pr-1",
          mobileTray ? "max-md:max-h-[var(--picker-mobile-tray-max-h,12.75rem)] max-md:overflow-y-auto max-md:overscroll-contain max-md:pr-0.5" : undefined,
          constrainOnDesktop ? "md:max-h-[19rem] md:overflow-y-auto md:overscroll-contain" : undefined,
          viewportClassName,
        )}
      >
        {children}
      </div>
      {shouldShowMobileFade ? (
        <>
          <div
            aria-hidden="true"
            className={appTokens.exercisePickerViewportMobileFadeTop}
          />
          <div
            aria-hidden="true"
            className={appTokens.exercisePickerViewportMobileFadeBottom}
          />
        </>
      ) : null}
      {shouldShowDesktopFade ? (
        <>
          <div
            aria-hidden="true"
            className={appTokens.exercisePickerViewportDesktopFadeTop}
          />
          <div
            aria-hidden="true"
            className={appTokens.exercisePickerViewportDesktopFadeBottom}
          />
        </>
      ) : null}
    </div>
  );
}
