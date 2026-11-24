import { cn } from "@/lib/cn";

/**
 * Loading placeholders on the foundation tokens. Every block pulses with `animate-pulse` and stops under reduced
 * motion (`motion-reduce:animate-none`, enforced by the reduced-motion scanner test). The shapes are the card the
 * content will become (same radius token, same outline, same surface tint), so a screen does not jump when the data
 * lands. They are decorative: the wrapper that owns the wait carries the `role="status"` / `aria-label`
 * (`SkeletonList`), the blocks themselves are `aria-hidden`.
 */
const PULSE = "animate-pulse motion-reduce:animate-none";
const BLOCK_FILL = "bg-[rgb(var(--surface-3-rgb)/0.84)]";
const CARD_SHELL = "rounded-[var(--radius-lg)] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.42)]";

export function SkeletonThumb({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(PULSE, BLOCK_FILL, "h-[72px] w-[72px] rounded-[var(--radius-md)] border border-[rgb(var(--border)/0.14)]", className)}
    />
  );
}

/** One bar of text (12px tall; it holds no text, so the 11px floor does not apply). Size it with `className` (`w-3/5`). */
export function SkeletonLine({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn(PULSE, BLOCK_FILL, "h-3 w-full rounded-full", className)} />;
}

/** A single list row placeholder (the History scope loader): one card-shaped block, 72px tall. */
export function SkeletonRow({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn(PULSE, CARD_SHELL, "h-[4.5rem]", className)} />;
}

/** A card with a thumbnail and three text bars (a routine, a day, an exercise). The card pulses as one block. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn(PULSE, CARD_SHELL, "flex min-h-[112px] items-center gap-4 px-4 py-4", className)}>
      <div className={cn(BLOCK_FILL, "h-[72px] w-[72px] shrink-0 rounded-[var(--radius-md)] border border-[rgb(var(--border)/0.14)]")} />
      <div className="min-w-0 flex-1 space-y-2">
        <div className={cn(BLOCK_FILL, "h-4 w-3/5 rounded-full")} />
        <div className={cn(BLOCK_FILL, "h-3 w-4/5 rounded-full")} />
        <div className={cn(BLOCK_FILL, "h-3 w-1/2 rounded-full")} />
      </div>
    </div>
  );
}

/**
 * The wrapper that owns the wait: `role="status"`, a name a screen reader can say ("Loading routines"), `aria-busy`,
 * and a stack of `count` rows 8px apart. `variant="card"` stacks `SkeletonCard`s instead of rows.
 */
export function SkeletonList({
  label,
  count = 2,
  variant = "row",
  className,
  ...rest
}: {
  label: string;
  count?: number;
  variant?: "row" | "card";
  className?: string;
} & Record<`data-${string}`, string | undefined>) {
  const Block = variant === "card" ? SkeletonCard : SkeletonRow;

  return (
    <div role="status" aria-label={label} aria-busy="true" className={cn("grid gap-2", className)} {...rest}>
      {Array.from({ length: count }, (_, index) => (
        <Block key={index} />
      ))}
    </div>
  );
}
