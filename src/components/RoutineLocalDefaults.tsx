"use client";

import { useEffect } from "react";
import { normalizeRoutineTimezone } from "@/lib/timezones";

type RoutineLocalDefaultsProps = {
  timezoneOptions: readonly string[];
};


export function RoutineLocalDefaults({ timezoneOptions }: RoutineLocalDefaultsProps) {
  useEffect(() => {
    const timezoneField = document.querySelector<HTMLInputElement>('input[name="timezone"]');

    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezoneField && localTimeZone) {
      const normalizedTimeZone = normalizeRoutineTimezone(localTimeZone);
      if (timezoneOptions.includes(normalizedTimeZone)) {
        timezoneField.value = normalizedTimeZone;
      }
    }

  }, [timezoneOptions]);

  return null;
}
