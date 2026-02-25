"use client";

import { useEffect } from "react";
import { normalizeRoutineTimezone } from "@/lib/timezones";

type RoutineLocalDefaultsProps = {
  timezoneOptions: readonly string[];
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RoutineLocalDefaults({ timezoneOptions }: RoutineLocalDefaultsProps) {
  useEffect(() => {
    const timezoneField = document.querySelector<HTMLSelectElement>('select[name="timezone"]');
    const startDateField = document.querySelector<HTMLInputElement>('input[name="startDate"]');

    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezoneField && localTimeZone) {
      const normalizedTimeZone = normalizeRoutineTimezone(localTimeZone);
      if (timezoneOptions.includes(normalizedTimeZone)) {
        timezoneField.value = normalizedTimeZone;
      }
    }

    if (startDateField) {
      startDateField.value = formatLocalDate(new Date());
    }
  }, [timezoneOptions]);

  return null;
}
