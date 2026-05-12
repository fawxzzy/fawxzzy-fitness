import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SignatureMiniPipe({
  className,
  barClassName,
}: {
  className?: string;
  barClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex h-[1em] w-[0.465rem] shrink-0 items-center justify-center align-middle", className)}
    >
      <span className={cn("block h-[0.88em] w-[3px] rounded-full bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.96),rgb(var(--accent-divider-rgb)/1),rgb(var(--accent-divider-rgb)/0.94))] shadow-[0_0_14px_rgb(var(--accent-divider-rgb)/0.58)]", barClassName)} />
    </span>
  );
}

export function SignatureDot({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-[5px] w-[5px] shrink-0 rounded-full bg-[rgb(var(--accent-divider-rgb)/1)] shadow-[0_0_8px_rgb(var(--accent-divider-rgb)/0.42)]", className)} />;
}

export function SignatureSectionBar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-[4px] w-3/4 rounded-full bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.3),rgb(var(--accent-divider-rgb)/1),rgb(var(--accent-divider-rgb)/0.3))] shadow-[0_0_16px_rgb(var(--accent-divider-rgb)/0.5)]",
        className,
      )}
    />
  );
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
        "inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.96)]",
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
  pipeClassName,
  pipeBarClassName,
}: {
  text: string;
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
  pipeClassName?: string;
  pipeBarClassName?: string;
}) {
  const normalized = String(text)
    .replaceAll("â€¢", "\u2022")
    .replaceAll("•", "\u2022")
    .trim();
  const tokens = normalized
    .split(/(\s+\|\s+|\s+\u2022\s+)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return null;
  }

  return (
    <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 [text-wrap:pretty]", className)}>
      {tokens.map((part, index) => {
        if (part === "|") {
          return <SignatureMiniPipe key={`pipe-${index}`} className={pipeClassName} barClassName={pipeBarClassName} />;
        }

        if (part === "\u2022") {
          const priorTextToken = [...tokens.slice(0, index)].reverse().find((token) => token !== "|" && token !== "\u2022");
          const shouldUsePipe = !tokens.includes("|")
            && typeof priorTextToken === "string"
            && /^\d+\s+set(s)?$/i.test(priorTextToken.trim());
          return shouldUsePipe
            ? <SignatureMiniPipe key={`pipe-${index}`} className={pipeClassName} barClassName={pipeBarClassName} />
            : <SignatureDot key={`dot-${index}`} className={separatorClassName} />;
        }

        return <span key={`${part}-${index}`} className={cn("min-w-0", itemClassName)}>{part}</span>;
      })}
    </span>
  );
}
