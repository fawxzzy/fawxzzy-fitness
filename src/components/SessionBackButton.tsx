"use client";

import { BackButton } from "@/components/ui/BackButton";

export function SessionBackButton() {
  return (
    <BackButton
      label="Back"
      ariaLabel="Back to Today"
      onClick={(event) => {
        const closeRequestEvent = new CustomEvent<{ closed: boolean }>("session-exercise-focus:close-request", {
          detail: { closed: false },
        });

        window.dispatchEvent(closeRequestEvent);

        if (closeRequestEvent.detail.closed) {
          event.preventDefault();
        }
      }}
    />
  );
}
