"use client";

import { useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import {
  resolvePasswordInputType,
  resolvePasswordVisibilityToggleLabel,
} from "@/lib/password-visibility";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  toggleClassName?: string;
  fitContent?: boolean;
  minVisibleCharacters?: number;
};

function PasswordVisibilityIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12c2.5-4 5.8-6 10-6s7.5 2 10 6c-2.5 4-5.8 6-10 6s-7.5-2-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {visible ? null : <path d="M4 4l16 16" />}
    </svg>
  );
}

export function PasswordInput({
  className,
  toggleClassName,
  fitContent = false,
  minVisibleCharacters = 0,
  onChange,
  value,
  defaultValue,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [draftValue, setDraftValue] = useState(
    typeof value === "string"
      ? value
      : typeof defaultValue === "string"
        ? defaultValue
        : "",
  );
  const toggleLabel = resolvePasswordVisibilityToggleLabel(isVisible);
  const resolvedValue = typeof value === "string" ? value : draftValue;
  const contentWidthCharacterCount = useMemo(
    () => Math.max(minVisibleCharacters, resolvedValue.length),
    [minVisibleCharacters, resolvedValue.length],
  );
  const fitContentStyle = fitContent
    ? {
        width: `min(100%, calc(${contentWidthCharacterCount + 3}ch + 3.5rem))`,
      }
    : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (typeof value !== "string") {
      setDraftValue(event.target.value);
    }
    onChange?.(event);
  }

  return (
    <div
      className={cn("relative", fitContent ? "mx-auto w-fit max-w-full" : undefined)}
      style={fitContentStyle}
    >
      <Input
        {...props}
        value={value}
        defaultValue={defaultValue}
        type={resolvePasswordInputType(isVisible)}
        onChange={handleChange}
        className={cn("pr-14", fitContent ? "w-full min-w-0" : undefined, className)}
      />
      <button
        type="button"
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        onClick={() => setIsVisible((current) => !current)}
        className={cn(
          "absolute right-0.5 top-1/2 inline-flex h-8 min-w-8 -translate-y-1/2 items-center justify-center rounded-full px-2 text-[rgb(var(--text-muted)/0.96)] transition-colors hover:bg-[rgb(var(--surface-2-rgb)/0.54)] hover:text-[rgb(var(--text-primary)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.22)]",
          toggleClassName,
        )}
      >
        <PasswordVisibilityIcon visible={isVisible} />
      </button>
    </div>
  );
}
