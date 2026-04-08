import type { ButtonHTMLAttributes } from "react";
import { ACTION_CHROME_CONTROL_CLASS_NAME, resolveSimpleButtonIntent } from "@/components/ui/actionChrome";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  className,
  variant = "secondary",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const intent = resolveSimpleButtonIntent(variant);

  return (
    <button
      type={type}
      data-action-chrome-intent={intent}
      className={cn(
        ACTION_CHROME_CONTROL_CLASS_NAME,
        "min-h-11 rounded-[var(--action-chrome-segment-radius)] px-3 text-sm font-medium focus-visible:ring-emerald-300/25 disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
