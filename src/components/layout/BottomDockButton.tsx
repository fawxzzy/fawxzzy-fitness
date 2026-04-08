import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  getBottomActionButtonClassName,
  resolveBottomActionIntent,
  type BottomActionIntent,
  type BottomDockButtonVariant,
} from "@/components/layout/bottomActionIntents";

export type { BottomActionIntent, BottomDockButtonVariant };

type BottomDockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function BottomDockButton({ children, intent, variant, className, loading = false, fullWidth = true, ...props }: BottomDockButtonProps) {
  const resolvedIntent = resolveBottomActionIntent({ intent, variant });
  const isDisabled = Boolean(props.disabled || loading);

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      data-bottom-action-intent={resolvedIntent}
      data-action-chrome-intent={resolvedIntent}
      data-action-chrome-segmented="true"
      className={getBottomActionButtonClassName({ intent: resolvedIntent, fullWidth, className })}
    >
      <span>{children}</span>
    </button>
  );
}

export function BottomDockLink({
  href,
  children,
  intent,
  variant,
  fullWidth = true,
  className,
}: {
  href: string;
  children: ReactNode;
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
  fullWidth?: boolean;
  className?: string;
}) {
  const resolvedIntent = resolveBottomActionIntent({ intent, variant });

  return (
    <Link
      href={href}
      data-bottom-action-intent={resolvedIntent}
      data-action-chrome-intent={resolvedIntent}
      data-action-chrome-segmented="true"
      className={getBottomActionButtonClassName({ intent: resolvedIntent, fullWidth, className })}
    >
      <span>{children}</span>
    </Link>
  );
}
