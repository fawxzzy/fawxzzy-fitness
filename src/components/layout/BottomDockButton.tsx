import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import {
  BOTTOM_ACTION_INTENT_CLASS_NAMES,
  getBottomActionAppButtonVariant,
  resolveBottomActionIntent,
  type BottomActionIntent,
  type BottomDockButtonVariant,
} from "@/components/layout/bottomActionIntents";
import { cn } from "@/lib/cn";

export type { BottomActionIntent, BottomDockButtonVariant };

const bottomDockBaseClassName = "min-h-[3.1rem] rounded-[1.08rem] px-4 text-sm font-semibold tracking-[0.01em]";

type BottomDockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
};

export function BottomDockButton({ children, intent, variant, className, ...props }: BottomDockButtonProps) {
  const resolvedIntent = resolveBottomActionIntent({ intent, variant });
  const resolvedVariant = getBottomActionAppButtonVariant(resolvedIntent);

  return (
    <AppButton
      {...props}
      variant={resolvedVariant}
      data-bottom-action-intent={resolvedIntent}
      fullWidth
      className={cn(bottomDockBaseClassName, BOTTOM_ACTION_INTENT_CLASS_NAMES[resolvedIntent], className)}
    >
      {children}
    </AppButton>
  );
}

export function BottomDockLink({
  href,
  children,
  intent,
  variant,
  className,
}: {
  href: string;
  children: ReactNode;
  intent?: BottomActionIntent;
  variant?: BottomDockButtonVariant;
  className?: string;
}) {
  const resolvedIntent = resolveBottomActionIntent({ intent, variant });
  const resolvedVariant = getBottomActionAppButtonVariant(resolvedIntent);

  return (
    <Link
      href={href}
      data-bottom-action-intent={resolvedIntent}
      className={getAppButtonClassName({
        variant: resolvedVariant,
        size: "md",
        fullWidth: true,
        className: cn(bottomDockBaseClassName, BOTTOM_ACTION_INTENT_CLASS_NAMES[resolvedIntent], className),
      })}
    >
      <span>{children}</span>
    </Link>
  );
}
