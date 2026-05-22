"use client";

import { useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

type FitContentInputProps = InputHTMLAttributes<HTMLInputElement> & {
  fitContent?: boolean;
  minVisibleCharacters?: number;
  wrapperClassName?: string;
};

export function FitContentInput({
  className,
  fitContent = true,
  wrapperClassName,
  minVisibleCharacters = 0,
  onChange,
  value,
  defaultValue,
  ...props
}: FitContentInputProps) {
  const [draftValue, setDraftValue] = useState(
    typeof value === "string"
      ? value
      : typeof defaultValue === "string"
        ? defaultValue
        : "",
  );

  const resolvedValue = typeof value === "string" ? value : draftValue;
  const contentWidthCharacterCount = useMemo(
    () => Math.max(minVisibleCharacters, resolvedValue.length),
    [minVisibleCharacters, resolvedValue.length],
  );

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (typeof value !== "string") {
      setDraftValue(event.target.value);
    }
    onChange?.(event);
  }

  return (
    <div
      className={cn(fitContent ? "mx-auto w-fit max-w-full" : "mx-auto w-full max-w-full", wrapperClassName)}
      style={
        fitContent
          ? {
              width: `min(100%, calc(${contentWidthCharacterCount + 3}ch + 3.5rem))`,
            }
          : undefined
      }
    >
      <Input
        {...props}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className={cn("w-full min-w-0", className)}
      />
    </div>
  );
}
