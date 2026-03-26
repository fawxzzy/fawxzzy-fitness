import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { cn } from "@/lib/cn";

export type BottomDockButtonVariant = "primary" | "secondary" | "destructive";

const bottomDockBaseClassName = "min-h-[3.1rem] rounded-[1.08rem] px-4 text-sm font-semibold tracking-[0.01em]";

const variantClassNames: Record<BottomDockButtonVariant, string> = {
  primary: "border-emerald-300/55 bg-emerald-500/30 text-emerald-50 shadow-[0_10px_26px_rgba(16,185,129,0.2)] hover:bg-emerald-500/36 active:bg-emerald-500/42",
  secondary: "border-white/14 bg-white/[0.045] text-[rgb(var(--text)/0.86)] shadow-none hover:bg-white/[0.08] active:bg-white/[0.12]",
  destructive: "border-rose-300/40 bg-rose-500/18 text-rose-100 shadow-[0_10px_24px_rgba(190,24,93,0.16)] hover:bg-rose-500/24 active:bg-rose-500/28",
};

type BottomDockButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  variant?: BottomDockButtonVariant;
};

export function BottomDockButton({ children, variant = "primary", className, ...props }: BottomDockButtonProps) {
  return (
    <AppButton
      {...props}
      variant={variant}
      fullWidth
      className={cn(bottomDockBaseClassName, variantClassNames[variant], className)}
    >
      {children}
    </AppButton>
  );
}

export function BottomDockLink({
  href,
  children,
  variant = "secondary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: BottomDockButtonVariant;
  className?: string;
}) {
  return (
    <Link href={href} className={getAppButtonClassName({ variant, size: "md", fullWidth: true, className: cn(bottomDockBaseClassName, variantClassNames[variant], className) })}>
      <span>{children}</span>
    </Link>
  );
}
