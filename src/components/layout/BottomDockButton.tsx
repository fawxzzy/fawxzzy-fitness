import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
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
  const loadingLabel = typeof children === "string" && children.trim().length > 0 ? `${children}...` : "Loading...";

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      data-bottom-action-intent={resolvedIntent}
      className={getBottomActionButtonClassName({ intent: resolvedIntent, fullWidth, className })}
    >
      <span className={cn("bottom-action__label", loading ? "opacity-0" : "")}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-current border-r-transparent" />
          <span className="bottom-action__label flex-none">{loadingLabel}</span>
        </span>
      ) : null}
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
      className={getBottomActionButtonClassName({ intent: resolvedIntent, fullWidth, className })}
    >
      <span className="bottom-action__label">{children}</span>
    </Link>
  );
}
