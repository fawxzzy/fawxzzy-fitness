"use client";

import { useMemo } from "react";

type LocalDateTimeProps = {
  value: string;
  options?: Intl.DateTimeFormatOptions;
};

export function LocalDateTime({ value, options }: LocalDateTimeProps) {
  const formatted = useMemo(() => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      ...options,
    });
  }, [options, value]);

  return <time dateTime={value}>{formatted}</time>;
}
