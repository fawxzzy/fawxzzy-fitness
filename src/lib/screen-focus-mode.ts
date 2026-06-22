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

type EditDayCloseExpandedCardDetail = {
  screen: "edit-day";
};

type EditDayAutoProgressionVisibilityDetail = {
  screen: "edit-day";
  visible: boolean;
};

type EditDayAdjustmentDirectionDetail = {
  screen: "edit-day";
  direction: "straight" | "up" | "down";
};

type EditDayTitleValidityDetail = {
  screen: "edit-day";
  canAddExercise: boolean;
};

const SCREEN_FOCUS_MODE_EVENT = "atlas:screen-focus-mode";
const SCREEN_MODE_EVENT = "atlas:screen-mode";
const EDIT_DAY_CLOSE_EXPANDED_CARD_EVENT = "atlas:edit-day-close-expanded-card";
const EDIT_DAY_AUTO_PROGRESSION_VISIBILITY_EVENT = "atlas:edit-day-auto-progression-visibility";
const EDIT_DAY_ADJUSTMENT_DIRECTION_EVENT = "atlas:edit-day-adjustment-direction";
const EDIT_DAY_TITLE_VALIDITY_EVENT = "atlas:edit-day-title-validity";

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

export function publishEditDayCloseExpandedCard(detail: EditDayCloseExpandedCardDetail = { screen: "edit-day" }) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<EditDayCloseExpandedCardDetail>(EDIT_DAY_CLOSE_EXPANDED_CARD_EVENT, { detail }));
}

export function subscribeEditDayCloseExpandedCard(
  onChange: () => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleEvent = (event: Event) => {
    const nextDetail = (event as CustomEvent<EditDayCloseExpandedCardDetail>).detail;
    if (!nextDetail || nextDetail.screen !== "edit-day") {
      return;
    }

    onChange();
  };

  window.addEventListener(EDIT_DAY_CLOSE_EXPANDED_CARD_EVENT, handleEvent as EventListener);
  return () => {
    window.removeEventListener(EDIT_DAY_CLOSE_EXPANDED_CARD_EVENT, handleEvent as EventListener);
  };
}

export function publishEditDayAutoProgressionVisibility(detail: EditDayAutoProgressionVisibilityDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<EditDayAutoProgressionVisibilityDetail>(EDIT_DAY_AUTO_PROGRESSION_VISIBILITY_EVENT, { detail }));
}

export function subscribeEditDayAutoProgressionVisibility(
  onChange: (visible: boolean) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleEvent = (event: Event) => {
    const nextDetail = (event as CustomEvent<EditDayAutoProgressionVisibilityDetail>).detail;
    if (!nextDetail || nextDetail.screen !== "edit-day") {
      return;
    }

    onChange(nextDetail.visible);
  };

  window.addEventListener(EDIT_DAY_AUTO_PROGRESSION_VISIBILITY_EVENT, handleEvent as EventListener);
  return () => {
    window.removeEventListener(EDIT_DAY_AUTO_PROGRESSION_VISIBILITY_EVENT, handleEvent as EventListener);
  };
}

export function publishEditDayAdjustmentDirection(detail: EditDayAdjustmentDirectionDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<EditDayAdjustmentDirectionDetail>(EDIT_DAY_ADJUSTMENT_DIRECTION_EVENT, { detail }));
}

export function subscribeEditDayAdjustmentDirection(
  onChange: (direction: "straight" | "up" | "down") => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleEvent = (event: Event) => {
    const nextDetail = (event as CustomEvent<EditDayAdjustmentDirectionDetail>).detail;
    if (!nextDetail || nextDetail.screen !== "edit-day") {
      return;
    }

    onChange(nextDetail.direction);
  };

  window.addEventListener(EDIT_DAY_ADJUSTMENT_DIRECTION_EVENT, handleEvent as EventListener);
  return () => {
    window.removeEventListener(EDIT_DAY_ADJUSTMENT_DIRECTION_EVENT, handleEvent as EventListener);
  };
}

export function publishEditDayTitleValidity(detail: EditDayTitleValidityDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<EditDayTitleValidityDetail>(EDIT_DAY_TITLE_VALIDITY_EVENT, { detail }));
}

export function subscribeEditDayTitleValidity(
  onChange: (canAddExercise: boolean) => void,
) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleEvent = (event: Event) => {
    const nextDetail = (event as CustomEvent<EditDayTitleValidityDetail>).detail;
    if (!nextDetail || nextDetail.screen !== "edit-day") {
      return;
    }

    onChange(nextDetail.canAddExercise);
  };

  window.addEventListener(EDIT_DAY_TITLE_VALIDITY_EVENT, handleEvent as EventListener);
  return () => {
    window.removeEventListener(EDIT_DAY_TITLE_VALIDITY_EVENT, handleEvent as EventListener);
  };
}
