import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  dotClassName?: string;
};

function ReorderHandleDot({ className }: { className?: string }) {
  return <span className={cn("block h-[3px] w-[3px] rounded-full bg-current", className)} />;
}

export function ReorderHandleGlyph({ className, dotClassName }: Props) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid h-full w-full grid-cols-[auto_auto_auto] place-items-center content-center justify-items-center gap-x-[2px]",
        className,
      )}
    >
      <span className="flex flex-col items-center justify-center gap-y-[2px]">
        <ReorderHandleDot className={dotClassName} />
        <ReorderHandleDot className={dotClassName} />
        <ReorderHandleDot className={dotClassName} />
      </span>
      <span className="relative flex h-[15px] w-[8px] items-center justify-center">
        <span className="absolute inset-x-[3px] top-[3px] bottom-[3px] rounded-full bg-[linear-gradient(180deg,rgb(var(--accent-strong)/0.98)_0%,rgb(var(--accent)/0.94)_42%,rgb(var(--danger-rgb)/0.9)_58%,rgb(var(--danger-rgb)/0.98)_100%)] shadow-[0_0_8px_rgb(var(--accent)/0.16)]" />
        <span className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[3px] border-b-[4px] border-x-transparent border-b-[rgb(var(--accent-strong)/0.98)] drop-shadow-[0_0_4px_rgb(var(--accent)/0.22)]" />
        <span className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[3px] border-t-[4px] border-x-transparent border-t-[rgb(var(--danger-rgb)/0.98)] drop-shadow-[0_0_4px_rgb(var(--danger-rgb)/0.18)]" />
      </span>
      <span className="flex flex-col items-center justify-center gap-y-[2px]">
        <ReorderHandleDot className={dotClassName} />
        <ReorderHandleDot className={dotClassName} />
        <ReorderHandleDot className={dotClassName} />
      </span>
    </span>
  );
}
