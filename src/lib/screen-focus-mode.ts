type ScreenFocusModeName = "edit-day";

type ScreenFocusModeDetail = {
  screen: ScreenFocusModeName;
  active: boolean;
};

const SCREEN_FOCUS_MODE_EVENT = "atlas:screen-focus-mode";

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
