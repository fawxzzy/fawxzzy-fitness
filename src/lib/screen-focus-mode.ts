type ScreenFocusModeName = "edit-day";
type ScreenModeName = "default" | "reorder" | "editing_exercise" | "rest_day";

type ScreenFocusModeDetail = {
  screen: ScreenFocusModeName;
  active: boolean;
};

type ScreenModeDetail = {
  screen: ScreenFocusModeName;
  mode: ScreenModeName;
};

const SCREEN_FOCUS_MODE_EVENT = "atlas:screen-focus-mode";
const SCREEN_MODE_EVENT = "atlas:screen-mode";

export function publishScreenFocusMode(detail: ScreenFocusModeDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<ScreenFocusModeDetail>(SCREEN_FOCUS_MODE_EVENT, { detail }));
}

export function subscribeScreenFocusMode(
  screen: ScreenFocusModeName,
  onChange: (active: boolean) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleEvent = (event: Event) => {
    const nextDetail = (event as CustomEvent<ScreenFocusModeDetail>).detail;
    if (!nextDetail || nextDetail.screen !== screen) {
      return;
    }

    onChange(nextDetail.active);
  };

  window.addEventListener(SCREEN_FOCUS_MODE_EVENT, handleEvent as EventListener);
  return () => {
    window.removeEventListener(SCREEN_FOCUS_MODE_EVENT, handleEvent as EventListener);
  };
}

export function publishScreenMode(detail: ScreenModeDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<ScreenModeDetail>(SCREEN_MODE_EVENT, { detail }));
}

export function subscribeScreenMode(
  screen: ScreenFocusModeName,
  onChange: (mode: ScreenModeName) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleEvent = (event: Event) => {
    const nextDetail = (event as CustomEvent<ScreenModeDetail>).detail;
    if (!nextDetail || nextDetail.screen !== screen) {
      return;
    }

    onChange(nextDetail.mode);
  };

  window.addEventListener(SCREEN_MODE_EVENT, handleEvent as EventListener);
  return () => {
    window.removeEventListener(SCREEN_MODE_EVENT, handleEvent as EventListener);
  };
}
