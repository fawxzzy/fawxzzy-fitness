import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SignatureMiniPipe({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex h-[0.9em] w-[0.45rem] shrink-0 items-center justify-center align-middle", className)}
    >
      <span className="block h-[0.82em] w-[2px] rounded-full bg-[linear-gradient(180deg,rgba(71,215,196,0.98),rgba(71,215,196,0.58))]" />
    </span>
  );
}

export function SignatureDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-[4px] w-[4px] shrink-0 rounded-full bg-[rgb(var(--accent)/0.9)]", className)} />;
}

export function SignatureMetaTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent)/0.96)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function isRenderablePart(part: ReactNode) {
  if (part === null || part === undefined || part === false) {
    return false;
  }

  if (typeof part === "string") {
    return part.trim().length > 0;
  }

  return true;
}

export function SignatureInlineList({
  items,
  separator = "dot",
  className,
  itemClassName,
}: {
  items: ReactNode[];
  separator?: "dot" | "pipe";
  className?: string;
  itemClassName?: string;
}) {
  const visibleItems = items.filter(isRenderablePart);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {visibleItems.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? (separator === "pipe" ? <SignatureMiniPipe /> : <SignatureDot />) : null}
          <span className={cn("min-w-0", itemClassName)}>{item}</span>
        </Fragment>
      ))}
    </span>
  );
}

export function AccentDotSeparatedText({
  text,
  className,
  itemClassName,
  separatorClassName,
}: {
  text: string;
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
}) {
  const parts = String(text)
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 ? <SignatureDot className={separatorClassName} /> : null}
          <span className={cn("min-w-0", itemClassName)}>{part}</span>
        </Fragment>
      ))}
    </span>
  );
}
