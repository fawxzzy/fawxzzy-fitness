import { cn } from "@/lib/cn";

export function SkeletonThumb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-[72px] w-[72px] animate-pulse rounded-[20px] border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface-3-rgb)/0.84)]",
        className,
      )}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[112px] animate-pulse items-center gap-4 rounded-[var(--radius-lg)] border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface-1-rgb)/0.88)] px-4 py-4",
        className,
      )}
    >
      <SkeletonThumb />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-3/5 rounded-full bg-[rgb(var(--surface-3-rgb)/0.88)]" />
        <div className="h-3 w-4/5 rounded-full bg-[rgb(var(--surface-3-rgb)/0.72)]" />
        <div className="h-3 w-1/2 rounded-full bg-[rgb(var(--surface-3-rgb)/0.72)]" />
      </div>
    </div>
  );
}
